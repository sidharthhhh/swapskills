import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Zod schema validation middleware factory.
 * Validates req.body against the provided schema.
 * Returns a generic "Invalid request data" message on failure — no field-level details exposed.
 *
 * TypeScript generic provides type inference on req.body after validation.
 */
export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid request data' },
      });
      return;
    }

    // Replace body with parsed/validated data
    req.body = result.data;
    next();
  };
}
