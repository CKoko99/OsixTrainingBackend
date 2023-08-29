import { Router } from "express";
import { db } from "../firebase.js";
import { doc, setDoc, getDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";

const router = Router(); // Create an instance of the Router
router.get("/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
        const userRef = doc(db, "Users", userId);
        // Now you can fetch the data for the specific user document
        const docSnapshot = await getDoc(userRef);
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();;
            //console.log(userData)
            res.json({ ...userData });
        } else {
            //console.log("User does not exist in firestore")
            await setDoc(userRef, {
                displayName: user.displayName,
                // Add any other user data fields here if needed
            });
            res.json({ userData: { displayName: user.displayName } });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}
)

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