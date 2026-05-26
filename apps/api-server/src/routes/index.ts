import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import quizRouter from "./quiz";
import resultsRouter from "./results";
import profileRouter from "./profile";
import pdfRouter from "./pdf";
import adaptiveRouter from "./adaptive";
import outputHistoryRouter from "./output-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/quiz", quizRouter);
router.use("/results", resultsRouter);
router.use("/profile", profileRouter);
router.use("/pdf", pdfRouter);
router.use("/adaptive", adaptiveRouter);
router.use("/output-history", outputHistoryRouter);

export default router;
