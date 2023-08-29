
import { Router } from "express";
import { db } from "../firebase.js";
import { getDocs, collection, query, where } from "firebase/firestore";

const router = Router(); // Create an instance of the Router

router.get("/:link", async (req, res) => {
    console.log(req.params.link)
    const link = req.params.link.split('|').filter(item => item !== '').map(item => item.toLowerCase());
    const pagesRef = collection(db, 'Pages'); // Replace 'db' with your Firestore instance
    const q = query(pagesRef, where('link', '==', link));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log('No matching documents.');
        res.status(404).json({ error: 'Page not found' });
    } else {
        const section = querySnapshot.docs[0].data().section;
        res.json({ section });
    }
}
)


export default router;