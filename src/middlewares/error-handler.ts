import { makeError } from "@/utils/error";
import { ErrorRequestHandler } from "express";

const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, next) => {
	const { error, statusCode } = makeError(err);
	console.error(error.message, error);
	res.status(statusCode).json(error);
};

export default errorHandlerMiddleware;
