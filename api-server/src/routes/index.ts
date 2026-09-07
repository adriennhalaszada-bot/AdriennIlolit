import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import listingsRouter from "./listings";
import favoritesRouter from "./favorites";
import conversationsRouter from "./conversations";
import transactionsRouter from "./transactions";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import auctionsRouter from "./auctions";
import offersRouter from "./offers";
import uploadRouter from "./upload";
import beautyProvidersRouter from "./beautyProviders";
import beautyBookingsRouter from "./beautyBookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(listingsRouter);
router.use(favoritesRouter);
router.use(conversationsRouter);
router.use(transactionsRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(auctionsRouter);
router.use(offersRouter);
router.use(uploadRouter);
router.use(beautyProvidersRouter);
router.use(beautyBookingsRouter);

export default router;
