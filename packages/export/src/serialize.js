function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObject(value[key])])
    );
  }

  return value;
}

export function serializeDeterministically(value, space = 2) {
  return `${JSON.stringify(sortObject(value), null, space)}\n`;
}
