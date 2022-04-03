import { z, ZodEffects, ZodError, ZodSchema, ZodType, ZodTypeDef } from 'zod';
import { Middleware } from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';

type NonReadOnly<T> = { -readonly [P in keyof T]: NonReadOnly<T[P]> };

export function stripReadOnly<T>(readOnlyItem: T): NonReadOnly<T> {
  return readOnlyItem as NonReadOnly<T>;
}

export declare type RequestValidation<TQuery, TBody> = {
  query?: ZodSchema<TQuery>;
  body?: ZodSchema<TBody>;
};
export declare type RequestProcessing<TQuery, TBody> = {
  query?: ZodEffects<any, TQuery>;
  body?: ZodEffects<any, TBody>;
};

export declare type TypedRequest<
  TQuery extends ZodType<any, ZodTypeDef, any>,
  TBody extends ZodType<any, ZodTypeDef, any>,
> = NextApiRequest & { body: z.infer<TBody>; query: z.infer<TQuery> };

export declare type TypedRequestBody<TBody extends ZodType<any, ZodTypeDef, any>> = NextApiRequest & {
  body: z.infer<TBody>;
};

export declare type TypedRequestQuery<TQuery extends ZodType<any, ZodTypeDef, any>> = NextApiRequest & {
  body: z.infer<TQuery>;
};

type ErrorListItem = { type: 'Query' | 'Params' | 'Body'; errors: ZodError<any> };

export const sendErrors: (errors: Array<ErrorListItem>, res: NextApiResponse) => void = (errors, res) => {
  return res.status(400).json({
    success: false,
    errorCode: 'bad_request',
    meta: errors.map((error) => ({ type: error.type, errors: error.errors })),
  });
};

export const sendError: (error: ErrorListItem, res: NextApiResponse) => void = (error, res) => {
  return res.json({
    success: false,
    errorCode: 'bad_request',
    meta: { type: error.type, errors: error.errors },
  });
};

export function processRequestBody<TBody>(effects: ZodSchema<TBody>): Middleware<NextApiRequest, NextApiResponse>;
export function processRequestBody<TBody>(effects: ZodEffects<any, TBody>): Middleware<NextApiRequest, NextApiResponse>;
export function processRequestBody<TBody>(
  effectsSchema: ZodEffects<any, TBody> | ZodSchema<TBody>,
): Middleware<NextApiRequest, NextApiResponse> {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.body);
    if (parsed.success) {
      req.body = parsed.data;
      return next();
    } else {
      return sendErrors([{ type: 'Body', errors: parsed.error }], res);
    }
  };
}

export function processRequestQuery<TQuery>(effects: ZodSchema<TQuery>): Middleware<NextApiRequest, NextApiResponse>;
export function processRequestQuery<TQuery>(
  effects: ZodEffects<any, TQuery>,
): Middleware<NextApiRequest, NextApiResponse>;
export function processRequestQuery<TQuery>(
  effectsSchema: ZodEffects<any, TQuery> | ZodSchema<TQuery>,
): Middleware<NextApiRequest, NextApiResponse> {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.query);
    if (parsed.success) {
      req.query = { ...req.query, ...parsed.data };
      return next();
    } else {
      return sendErrors([{ type: 'Query', errors: parsed.error }], res);
    }
  };
}

export function processRequest<TQuery = any, TBody = any>(
  schemas: RequestProcessing<TQuery, TBody>,
): Middleware<NextApiRequest, NextApiResponse>;
export function processRequest<TQuery = any, TBody = any>(
  schemas: RequestValidation<TQuery, TBody>,
): Middleware<NextApiRequest, NextApiResponse>;
export function processRequest<TQuery = any, TBody = any>(
  schemas: RequestValidation<TQuery, TBody>,
): Middleware<NextApiRequest, NextApiResponse> {
  return (req, res, next) => {
    const errors: Array<ErrorListItem> = [];

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (parsed.success) {
        req.query = { ...req.query, ...parsed.data };
      } else {
        errors.push({ type: 'Query', errors: parsed.error });
      }
    }
    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (parsed.success) {
        req.body = parsed.data;
      } else {
        errors.push({ type: 'Body', errors: parsed.error });
      }
    }
    if (errors.length > 0) {
      return sendErrors(errors, res);
    }
    return next();
  };
}

export const validateRequestBody: <TBody>(
  zodSchema: ZodSchema<TBody>,
) => Middleware<NextApiRequest & { body: z.infer<typeof zodSchema> }, NextApiResponse> =
  (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (parsed.success) {
      return next();
    } else {
      return sendErrors([{ type: 'Body', errors: parsed.error }], res);
    }
  };

export const validateRequestQuery: <TQuery>(
  zodSchema: ZodSchema<TQuery>,
) => Middleware<NextApiRequest & { query: z.infer<typeof zodSchema> }, NextApiResponse> =
  (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (parsed.success) {
      return next();
    } else {
      return sendErrors([{ type: 'Query', errors: parsed.error }], res);
    }
  };

type ExtendNextApiRequest<TBody, TQuery> = NextApiRequest & {
  body: TBody;
  query: TQuery;
};

export const validateRequest: <TQuery = any, TBody = any>(
  schemas: RequestValidation<TQuery, TBody>,
) => Middleware<ExtendNextApiRequest<z.infer<ZodSchema<TBody>>, z.infer<ZodSchema<TQuery>>>, NextApiResponse> =
  ({ query, body }) =>
  (req, res, next) => {
    const errors: Array<ErrorListItem> = [];

    if (query) {
      const parsed = query.safeParse(req.query);
      if (!parsed.success) {
        errors.push({ type: 'Query', errors: parsed.error });
      }
    }
    if (body) {
      const parsed = body.safeParse(req.body);
      if (!parsed.success) {
        errors.push({ type: 'Body', errors: parsed.error });
      }
    }
    if (errors.length > 0) {
      return sendErrors(errors, res);
    }
    return next();
  };
