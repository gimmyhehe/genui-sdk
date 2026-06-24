import { inject, Pipe, PipeTransform } from '@angular/core';
import { RendererSettingsService } from './renderer-settings.service';

const isArrayIndex = (key: string): boolean => /^\d+$/.test(key);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fillMissingValue = (
  target: Record<string, unknown>,
  propertyPath: string,
  defaultValue: unknown,
): void => {
  const keys = propertyPath.split('.')
  let current: Record<string, unknown> = target

  for (const key of keys.slice(0, -1)) {
    const nextValue = current[key]
    if (nextValue == null) {
      current[key] = {}
      current = current[key] as Record<string, unknown>
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
  private readonly rendererSettings = inject(RendererSettingsService, { optional: true });

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
