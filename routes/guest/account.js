import { Router } from "express";
const router = Router();
import accountData from "../../data/account.js";

router.route("/").get(async (req, res) => {
  try {
    res.render("../views/login/UserCreate", {
      title: "guest account",
    });
  } catch (e) {}
});

export default router;