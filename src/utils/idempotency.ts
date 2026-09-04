export const generateIdempotencyKey = (prefix: string = 'req'): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomStr}`;
};
