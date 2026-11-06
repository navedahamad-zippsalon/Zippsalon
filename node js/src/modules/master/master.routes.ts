import { Router } from "express";
import * as masterController from "./master.controller";
import { validate } from "../../common/middleware/validate.middleware";
import { idParam } from "../../validators/common";

const router = Router();

router.get("/countries", masterController.getCountries);
router.get("/countries/:countryId/states", validate({ params: idParam("countryId") }), masterController.getStates);
router.get("/states/:stateId/cities", validate({ params: idParam("stateId") }), masterController.getCities);

export default router;
