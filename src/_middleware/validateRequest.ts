// src/_middleware/validateRequest.ts
import type { Request, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(
    req: Request,
    next: NextFunction,
    schema: Joi.ObjectSchema
): void {
    const options = {
        abortEarly: false, // Include all errors
        allowUnknown: true, // Allow unknown keys that are not defined in the schema
        stripUnknown: true // Remove unknown keys from the validated data
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
        next(`Validation error: ${error.details.map((d) => d.message).join(', ')}`);
    } else {
        req.body = value;
        next();
    }
}