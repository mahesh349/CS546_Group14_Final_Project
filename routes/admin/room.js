// Admin can create, edit, delete and see all the rooms in this page:
// Create room : room number, room type, room price, availability, room photos link, room description from input will be acepteed
// edit room: we cna edit all the details
// delete: we need to add the room number and type to delete the room from the database

import { Router } from "express";
const router = Router();

router.get("/", async (req, res) => {
  try {
    res.render("./Admin/adminRoom/adminRoom", {
      title: "admin Room/dashboard manipulation",
    });
  } catch (e) {}
});

export default router;