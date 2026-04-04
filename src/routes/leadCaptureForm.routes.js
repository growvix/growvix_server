import { Router } from "express";
import { createForm, getForms, deleteForm, getFormById, updateForm } from "../controllers/leadCaptureForm.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protect, createForm);
router.get("/", protect, getForms);
router.get("/:id", protect, getFormById);
router.put("/:id", protect, updateForm);
router.delete("/:id", protect, deleteForm);

export default router;
