/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

type RequestHandlerCustom<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = Query> = (
	req: Request<P, ResBody, ReqBody, ReqQuery>,
	res: Response<ResBody>,
	next: NextFunction
) => void | Promise<void>;

const onPromise = <P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = Query>(
	handler: RequestHandlerCustom<P, ResBody, ReqBody, ReqQuery>
): RequestHandlerCustom<P, ResBody, ReqBody, ReqQuery> => {
	return (req, res, next) => {
		const maybePromise = handler(req, res, next);
		if (maybePromise && maybePromise.then) {
			maybePromise.then(() => next()).catch(next);
		}
	};
};

export default onPromise;
