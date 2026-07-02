import { z, type ZodTypeAny } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;

function isReference(schema: SchemaObject | ReferenceObject): schema is ReferenceObject {
  return '$ref' in schema;
}

function withDescription(schema: ZodTypeAny, description?: string): ZodTypeAny {
  return description ? schema.describe(description) : schema;
}

function schemaToZod(schema: SchemaObject | ReferenceObject | undefined, required = true): ZodTypeAny {
  if (!schema || isReference(schema)) {
    return required ? z.string() : z.string().optional();
  }

  if (schema.enum?.length) {
    const values = schema.enum;
    const allNumbers = values.every((v) => typeof v === 'number');
    const result = allNumbers
      ? z.union(
          values.map((v) => z.literal(v as number)) as [
            z.ZodLiteral<number>,
            z.ZodLiteral<number>,
            ...z.ZodLiteral<number>[],
          ],
        )
      : z.enum(values.map(String) as [string, ...string[]]);
    return withDescription(result, schema.description);
  }

  const type = schema.type;
  let result: ZodTypeAny;

  switch (type) {
    case 'integer':
      result = z.number().int();
      break;
    case 'number':
      result = z.number();
      break;
    case 'boolean':
      result = z.boolean();
      break;
    case 'array': {
      const itemSchema = schema.items
        ? schemaToZod(schema.items as SchemaObject, true)
        : z.unknown();
      result = z.array(itemSchema);
      break;
    }
    case 'object': {
      const shape: Record<string, ZodTypeAny> = {};
      const props = schema.properties ?? {};
      const requiredFields = new Set(schema.required ?? []);

      for (const [key, propSchema] of Object.entries(props)) {
        shape[key] = schemaToZod(propSchema as SchemaObject, requiredFields.has(key));
      }

      const hasDeclaredProps = Object.keys(shape).length > 0;
      const additional = schema.additionalProperties;

      if (additional === false) {
        result = hasDeclaredProps ? z.object(shape).strict() : z.object({}).strict();
      } else if (additional === true) {
        result = hasDeclaredProps
          ? z.object(shape).catchall(z.unknown())
          : z.record(z.string(), z.unknown());
      } else if (additional !== undefined) {
        const valueSchema = schemaToZod(additional as SchemaObject | ReferenceObject, true);
        result = hasDeclaredProps
          ? z.object(shape).catchall(valueSchema)
          : z.record(z.string(), valueSchema);
      } else {
        result = hasDeclaredProps ? z.object(shape) : z.record(z.string(), z.unknown());
      }
      break;
    }
    default:
      if (schema.oneOf?.length) {
        result = z.union(
          schema.oneOf.map((s) => schemaToZod(s as SchemaObject, true)) as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]],
        );
        break;
      }
      if (schema.anyOf?.length) {
        result = z.union(
          schema.anyOf.map((s) => schemaToZod(s as SchemaObject, true)) as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]],
        );
        break;
      }
      result = z.unknown();
  }

  if (schema.default !== undefined) {
    result = result.default(schema.default);
  }

  return withDescription(required ? result : result.optional(), schema.description);
}

export function parametersToZodShape(parameters: { name: string; schema: SchemaObject; required: boolean; description?: string }[]) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const param of parameters) {
    let field = schemaToZod(param.schema, param.required);
    if (param.description) {
      field = field.describe(param.description);
    }
    shape[param.name] = field;
  }

  return shape;
}

export function requestBodyToZodField(
  schema: SchemaObject | undefined,
  required: boolean,
): Record<string, ZodTypeAny> {
  if (!schema) return {};
  return { body: schemaToZod(schema, required) };
}
