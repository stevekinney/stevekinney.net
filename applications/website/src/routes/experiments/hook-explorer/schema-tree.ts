/**
 * Turns a JSON Schema (as zod's `toJSONSchema` writes it) into a tree of
 * fields the page can draw, and fills in a sample payload from it. Dependency
 * free, so the page can import its types without pulling in a schema library.
 */

/** The subset of JSON Schema the hook schemas produce. */
export type JsonSchema = {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  $ref?: string;
  [key: string]: unknown;
};

export type FieldValue = string | number | boolean | null;

/** One branch of a field that takes several shapes, named by the key that tells them apart. */
export type FieldVariant = {
  /** For example `behavior: allow`. */
  label: string;
  fields: FieldNode[];
  strict: boolean;
};

export type FieldNode = {
  name: string;
  /** A short type label, such as `string`, `string or null`, or `array of objects`. */
  type: string;
  required: boolean;
  /** The allowed values when the field is a constant or an enum. */
  values?: FieldValue[];
  /** The fields of a nested object, or of each item in an array of objects. */
  children?: FieldNode[];
  /** The shapes a field can take, when it's one of several objects. */
  variants?: FieldVariant[];
  /** A nested object that rejects keys it doesn't list. */
  strict?: boolean;
  /** Set on fields every event of the tool carries. */
  common?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertNoReference = (schema: JsonSchema): void => {
  if (schema.$ref) throw new Error(`Unexpected $ref ${schema.$ref}: inline every definition.`);
};

const branchesOf = (schema: JsonSchema): JsonSchema[] | undefined => schema.oneOf ?? schema.anyOf;

const typesOf = (schema: JsonSchema): string[] =>
  schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];

const isStrict = (schema: JsonSchema): boolean => schema.additionalProperties === false;

/** Whether an object schema lists its fields, as opposed to a record of any keys. */
const hasFields = (schema: JsonSchema): boolean =>
  isRecord(schema.properties) && Object.keys(schema.properties).length > 0;

/** The key whose constant tells a set of object branches apart, such as `type` or `behavior`. */
const discriminatorOf = (branches: JsonSchema[]): string | undefined => {
  const [first] = branches;
  if (!first?.properties) return undefined;

  return Object.keys(first.properties).find((key) =>
    branches.every((branch) => branch.properties?.[key]?.const !== undefined),
  );
};

const variantsOf = (branches: JsonSchema[]): FieldVariant[] => {
  const key = discriminatorOf(branches);

  return branches.map((branch, index) => ({
    label: key ? `${key}: ${String(branch.properties?.[key]?.const)}` : `Shape ${index + 1}`,
    fields: fieldsOf(branch),
    strict: isStrict(branch),
  }));
};

const valuesOf = (schema: JsonSchema): FieldValue[] | undefined => {
  if (schema.const !== undefined) return [schema.const as FieldValue];
  if (Array.isArray(schema.enum)) return schema.enum as FieldValue[];

  return undefined;
};

/** A short label for a schema's type. */
export const typeLabel = (schema: JsonSchema): string => {
  assertNoReference(schema);
  const branches = branchesOf(schema);
  if (branches) {
    return branches.every((branch) => typesOf(branch).includes('object'))
      ? 'object'
      : 'one of several types';
  }

  const types = typesOf(schema);
  if (types.length === 0) return 'any JSON';
  if (types.length > 1) return types.join(' or ');

  if (types[0] === 'array') {
    const items = schema.items;
    if (!items || typesOf(items).length === 0) return 'array';
    const itemType = typeLabel(items);

    return itemType === 'object' ? 'array of objects' : `array of ${itemType}s`;
  }

  return types[0] ?? 'any JSON';
};

const nodeFor = (name: string, schema: JsonSchema, required: boolean): FieldNode => {
  assertNoReference(schema);
  const node: FieldNode = { name, type: typeLabel(schema), required };
  const values = valuesOf(schema);
  if (values) node.values = values;

  // An array's item shape is drawn as the array's own children.
  const shape = typesOf(schema).includes('array') && schema.items ? schema.items : schema;
  const branches = branchesOf(shape);

  if (branches && branches.every((branch) => hasFields(branch))) {
    node.variants = variantsOf(branches);
  } else if (hasFields(shape)) {
    node.children = fieldsOf(shape);
    if (isStrict(shape)) node.strict = true;
  }

  return node;
};

/** The fields of an object schema, in the schema's own order. */
export const fieldsOf = (schema: JsonSchema): FieldNode[] => {
  assertNoReference(schema);
  const required = new Set(schema.required ?? []);

  return Object.entries(schema.properties ?? {}).map(([name, property]) =>
    nodeFor(name, property, required.has(name)),
  );
};

/** Whether a top-level object schema rejects keys it doesn't list. */
export const isStrictObject = (schema: JsonSchema): boolean => isStrict(schema);

/** The value a sample payload uses for a field of this type. */
const placeholder = (name: string, schema: JsonSchema): unknown => {
  const [type] = typesOf(schema).filter((candidate) => candidate !== 'null');

  switch (type) {
    case 'string':
      return `<${name}>`;
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return sampleObject(schema, []);
    case 'null':
      return null;
    default:
      // No type at all: any JSON value, such as `tool_input`.
      return {};
  }
};

/** A sample value for a schema: its constant, its first allowed value, or a typed placeholder. */
export const sampleValue = (name: string, schema: JsonSchema): unknown => {
  assertNoReference(schema);
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  const [firstBranch] = branchesOf(schema) ?? [];
  if (firstBranch) return sampleValue(name, firstBranch);

  return placeholder(name, schema);
};

/**
 * An object holding every required field, plus any optional field named in
 * `include` (the sample output always shows `hookSpecificOutput`, say).
 */
export const sampleObject = (schema: JsonSchema, include: readonly string[]): unknown => {
  assertNoReference(schema);
  const required = new Set(schema.required ?? []);
  const sample: Record<string, unknown> = {};

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (required.has(name) || include.includes(name)) sample[name] = sampleValue(name, property);
  }

  return sample;
};

/** Pretty-prints a sample the way the page shows it. */
export const formatSample = (value: unknown): string => JSON.stringify(value, null, 2);
