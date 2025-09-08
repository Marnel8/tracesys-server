import multer from "multer";
import { IUser } from "../user";

declare global {
	namespace Express {
		interface Request {
			user: IUser;
			file?: multer.File;
			files?: Multer.File[];
		}
	}
}
