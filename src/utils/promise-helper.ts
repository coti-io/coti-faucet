export const exec = <T>(p: Promise<T>): Promise<[any, T]> =>
  p
    .then((res: T): [any, T] => [null, res])
    .catch((error: any): [any, T] => [error, null]);
