import { NextFunction, Request, Response } from "express";
import { z } from "zod";

type ValidationSchemas = {
    body?: z.ZodTypeAny;
    params?: z.ZodTypeAny;
    query?: z.ZodTypeAny;
    headers?: z.ZodTypeAny;
};

export const validate = (schemas: ValidationSchemas) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schemas.body) req.body = schemas.body.parse(req.body);
            if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
            if (schemas.query) {
                const parsedQuery = schemas.query.parse(req.query);
                try {
                    req.query = parsedQuery as typeof req.query;
                } catch {
                    Object.assign(req.query, parsedQuery);
                }
            }
            if (schemas.headers) {
                const parsedHeaders = schemas.headers.parse(req.headers);
                Object.assign(req.headers, parsedHeaders);
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
}).passthrough();

export const uuidParam = (name: string) => z.object({ [name]: z.string().uuid() });
