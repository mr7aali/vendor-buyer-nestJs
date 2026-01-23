/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const successResponse = (
  data: any,
  message = "Success",
  statusCode = 200,
) => ({
  success: true,
  statusCode,
  message,
  data,
});

export const errorResponse = (
  message: string | object,
  statusCode: number,
  errors?: any,
) => ({
  success: false,
  statusCode,
  message,
  errors,
});
