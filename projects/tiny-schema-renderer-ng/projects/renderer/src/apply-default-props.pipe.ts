import { inject, Pipe, PipeTransform } from '@angular/core';
import { RendererSettingsService } from './renderer-settings.service';

const isArrayIndex = (key: string): boolean => /^\d+$/.test(key);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneDefaultValue = (value: unknown): unknown => {
  if (!isObjectRecord(value) && !Array.isArray(value)) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
};

const fillMissingValue = (
  target: Record<string, unknown>,
  propertyPath: string,
  defaultValue: unknown,
): void => {
  const keys = propertyPath.split('.');
  let current: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const container = current as Record<string, unknown>;
    const nextValue = container[key];
    if (nextValue == null) {
      container[key] = isArrayIndex(nextKey) ? [] : {};
      current = container[key] as Record<string, unknown> | unknown[];
      continue;
    }

    if (!isObjectRecord(nextValue) && !Array.isArray(nextValue)) {
      return;
    }

    current = nextValue;
  }

  const leafKey = keys[keys.length - 1];
  const leafContainer = current as Record<string, unknown>;
  if (leafContainer[leafKey] == null) {
    leafContainer[leafKey] = cloneDefaultValue(defaultValue);
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
