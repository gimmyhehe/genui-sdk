import { inject, Pipe, PipeTransform } from '@angular/core';
import { RENDERER_SETTINGS } from './renderer-settings';

export type PropsValue = any;
export type DefaultValue = any;

const isObjectRecord = (value: PropsValue): value is Record<string, PropsValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fillMissingValue = (
  target: Record<string, PropsValue>,
  propertyPath: string,
  defaultValue: DefaultValue,
): void => {
  const keys = propertyPath.split('.')
  let current: Record<string, PropsValue> = target

  for (const key of keys.slice(0, -1)) {
    const nextValue = current[key]
    if (nextValue == null) {
      current[key] = {}
      current = current[key]
      continue
    }

    if (!isObjectRecord(nextValue)) {
      return
    }

    current = nextValue
  }

  const leafKey = keys[keys.length - 1]
  if (current[leafKey] == null) {
    current[leafKey] = structuredClone(defaultValue)
  }
};

@Pipe({
  name: 'applyDefaultProps',
  standalone: true,
  pure: false,
})
export class ApplyDefaultPropsPipe implements PipeTransform {
  private readonly rendererSettings = inject(RENDERER_SETTINGS, { optional: true });

  transform(
    props: Record<string, unknown> | null | undefined,
    componentName: string,
  ): Record<string, unknown> {
    const result = props ?? {};
    const defaultPropsMap = this.rendererSettings?.defaultPropsMap;
    if (typeof componentName !== 'string' || !isObjectRecord(defaultPropsMap)) {
      return result;
    }

    const componentDefaults = defaultPropsMap[componentName];
    if (!componentDefaults) {
      return result;
    }

    Object.entries(componentDefaults).forEach(([propertyPath, defaultValue]) => {
      fillMissingValue(result, propertyPath, defaultValue);
    });
    return result;
  }
}
