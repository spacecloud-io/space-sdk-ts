// An interface to describe a json schema object
export interface JsonSchema {
  // A property to specify the type of the value
  type?: "string" | "number" | "boolean" | "object" | "array" | "null";

  // A property to specify a constant value
  const?: any;

  // A property to specify an array of possible values
  enum?: any[];

  // A property to specify the minimum value for numbers
  minimum?: number;

  // A property to specify the maximum value for numbers
  maximum?: number;

  // A property to specify the minimum length for strings
  minLength?: number;

  // A property to specify the maximum length for strings
  maxLength?: number;

  // A property to specify a regular expression pattern for strings
  pattern?: string;

  // A property to specify the items schema for arrays
  items?: JsonSchema;

  // A property to specify the minimum number of items for arrays
  minItems?: number;

  // A property to specify the maximum number of items for arrays
  maxItems?: number;

  // A property to specify if the items in an array should be unique
  uniqueItems?: boolean;

  // A property to specify the properties schema for objects
  properties?: { [key: string]: JsonSchema };

  // A property to specify the required properties for objects
  required?: string[];

  // A property to specify the additional properties schema for objects
  additionalProperties?: boolean | JsonSchema;

  // A property to specify one of the possible schemas
  oneOf?: JsonSchema[];

  // A property to specify any of the possible schemas
  anyOf?: JsonSchema[];

  // A property to specify all of the possible schemas
  allOf?: JsonSchema[];
}