import { ParamsDictionary } from 'express-serve-static-core';
import { z, ZodEffects, ZodError, ZodSchema, ZodType, ZodTypeDef } from 'zod';
import { answer, ErrorCodes } from 'nextjs-api-utils';
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

type NonReadOnly<T> = { -readonly [P in keyof T]: NonReadOnly<T[P]> };

export function stripReadOnly<T>(readOnlyItem: T): NonReadOnly<T> {
  return readOnlyItem as NonReadOnly<T>;
}

export declare type RequestValidation<TParams, TQuery, TBody> = {
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
  body?: ZodSchema<TBody>;
};
export declare type RequestProcessing<TParams, TQuery, TBody> = {
  params?: ZodEffects<any, TParams>;
  query?: ZodEffects<any, TQuery>;
  body?: ZodEffects<any, TBody>;
};

export declare type TypedRequest<
  TParams extends ZodType<any, ZodTypeDef, any>,
  TQuery extends ZodType<any, ZodTypeDef, any>,
  TBody extends ZodType<any, ZodTypeDef, any>,
> = NextApiRequest;

export declare type TypedRequestBody<TBody extends ZodType<any, ZodTypeDef, any>> = NextApiRequest;

export declare type TypedRequestParams<TParams extends ZodType<any, ZodTypeDef, any>> = NextApiRequest;
export declare type TypedRequestQuery<TQuery extends ZodType<any, ZodTypeDef, any>> = NextApiRequest;
type ErrorListItem = { type: 'Query' | 'Params' | 'Body'; errors: ZodError<any> };

export const sendErrors: (errors: Array<ErrorListItem>, res: NextApiResponse, req: NextApiRequest) => void = (
  errors,
  res,
  req,
) => {
  return answer(req, res, {
    statusCode: 400,
    data: null,
    errorCode: ErrorCodes.BAD_REQUEST,
    meta: errors.map((error) => ({ type: error.type, errors: error.errors })),
  });
  // return res.status(400).send(errors.map((error) => ({ type: error.type, errors: error.errors })));
};
export const sendError: (error: ErrorListItem, res: NextApiResponse) => void = (error, res) => {
  return res.status(400).send({ type: error.type, errors: error.errors });
};

type Response<T = any> = (
  req: NextApiRequest & { params: { [x: string]: any } },
  res: NextApiResponse<T>,
  next: () => void,
) => void | Promise<void>;

export function processRequestBody<TBody>(effects: ZodSchema<TBody>): NextApiHandler;
export function processRequestBody<TBody>(effects: ZodEffects<any, TBody>): Response;
export function processRequestBody<TBody>(effectsSchema: ZodEffects<any, TBody> | ZodSchema<TBody>): Response {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.body);
    if (parsed.success) {
      req.body = parsed.data;
      return next();
    } else {
      return sendErrors([{ type: 'Body', errors: parsed.error }], res, req);
    }
  };
}

export function processRequestParams<TParams>(effects: ZodSchema<TParams>): Response;
export function processRequestParams<TParams>(effects: ZodEffects<any, TParams>): Response;
export function processRequestParams<TParams>(effectsSchema: ZodEffects<any, TParams> | ZodSchema<TParams>): Response {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.query);
    if (parsed.success) {
      req.query = { ...req.query, ...parsed.data };
      return next();
    } else {
      return sendErrors([{ type: 'Params', errors: parsed.error }], res, req);
    }
  };
}

export function processRequestQuery<TQuery>(effects: ZodSchema<TQuery>): Response;
export function processRequestQuery<TQuery>(effects: ZodEffects<any, TQuery>): Response;
export function processRequestQuery<TQuery>(effectsSchema: ZodEffects<any, TQuery> | ZodSchema<TQuery>): Response {
  return (req, res, next) => {
    const parsed = effectsSchema.safeParse(req.query);
    if (parsed.success) {
      req.query = { ...req.query, ...parsed.data };
      return next();
    } else {
      return sendErrors([{ type: 'Query', errors: parsed.error }], res, req);
    }
  };
}

export function processRequest<TParams = any, TQuery = any, TBody = any>(
  schemas: RequestProcessing<TParams, TQuery, TBody>,
): Response;
export function processRequest<TParams = any, TQuery = any, TBody = any>(
  schemas: RequestValidation<TParams, TQuery, TBody>,
): Response;
export function processRequest<TParams = any, TQuery = any, TBody = any>(
  schemas: RequestValidation<TParams, TQuery, TBody> | RequestProcessing<TParams, TQuery, TBody>,
): Response {
  return (req, res, next) => {
    const errors: Array<ErrorListItem> = [];
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (parsed.success) {
        req.query = { ...req.query, ...parsed.data };
      } else {
        errors.push({ type: 'Params', errors: parsed.error });
      }
    }
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
      return sendErrors(errors, res, req);
    }
    return next();
  };
}

export const validateRequestBody: <TBody>(zodSchema: ZodSchema<TBody>) => Response = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (parsed.success) {
    return next();
  } else {
    return sendErrors([{ type: 'Body', errors: parsed.error }], res, req);
  }
};

export const validateRequestParams: <TParams>(zodSchema: ZodSchema<TParams>) => Response =
  (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (parsed.success) {
      return next();
    } else {
      return sendErrors([{ type: 'Params', errors: parsed.error }], res, req);
    }
  };

export const validateRequestQuery: <TQuery>(zodSchema: ZodSchema<TQuery>) => Response =
  (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (parsed.success) {
      return next();
    } else {
      return sendErrors([{ type: 'Query', errors: parsed.error }], res, req);
    }
  };

export const validateRequest: <TParams = any, TQuery = any, TBody = any>(
  schemas: RequestValidation<TParams, TQuery, TBody>,
) => Response =
  ({ params, query, body }) =>
  (req, res, next) => {
    const errors: Array<ErrorListItem> = [];
    if (params) {
      const parsed = params.safeParse(req.params);
      if (!parsed.success) {
        errors.push({ type: 'Params', errors: parsed.error });
      }
    }
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
      return sendErrors(errors, res, req);
    }
    return next();
  };
