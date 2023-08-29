import { Router } from "express";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";

const router = Router(); // Create an instance of the Router

router.post("/form", async (req, res) => {
    console.log(req.body)
    const userId = req.body.userId;
    const formId = req.body.formId;
    const userRef = doc(db, "Users", userId);

    const response = await setDoc(userRef, { completedForms: arrayUnion(formId) }, { merge: true });
    res.json({ response });

}
)


export default router;