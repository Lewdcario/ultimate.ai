import { NextFunction, Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err);
	res.status(500).send({ errors: [{ message: 'Something went wrong' }] });
};

export default errorHandler;
