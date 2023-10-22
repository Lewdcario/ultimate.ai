import { NextFunction, Request, Response } from 'express';
import Logger from '../util/Logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
	Logger.error(err);
	res.status(500).send({ errors: [{ message: 'Something went wrong' }] });
};

export default errorHandler;
