import { Request, Response, NextFunction } from 'express';
import Ajv, { AnySchema } from 'ajv';

const ajv = new Ajv();

function validateSchema<T extends AnySchema>(schema: T) {
	return (req: Request, res: Response, next: NextFunction) => {
		const validate = ajv.compile(schema);
		const valid = validate(req.body);

		if (!valid) {
			return res.status(400).json({ errors: validate.errors });
		}

		return next();
	};
}

export default validateSchema;
