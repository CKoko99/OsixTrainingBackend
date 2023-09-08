import { Router } from "express";
import { dbAdmin as db } from "../firebaseAdmin.js";
import { doc, setDoc, getDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";

const router = Router(); // Create an instance of the Router

router.get('/:store/email', async (req, res) => {
    try {
        const store = req.params.store;

        // Reference the 'Regions' collection using Firebase Admin SDK
        const regionsCollection = db.collection('Regions');

        // Create a query to find documents where 'name' matches 'store'
        const q = regionsCollection.where('name', '==', store);

        // Execute the query
        const querySnapshot = await q.get();
        const emailList = [];

        if (!querySnapshot.empty) {
            const regionDoc = querySnapshot.docs[0];
            const district = regionDoc.data().Districts.find(d => d.name === userDetails.store[1]);
            if (district) {
                const store = district.Stores.find(s => s.name === userDetails.store[2]);
                if (store) {
                    if (regionDoc.data().emails) {
                        emailList.push(...regionDoc.data().emails);
                    }
                    if (district.emails) {
                        console.log(district.emails);
                        emailList.push(...district.emails);
                    }
                    if (store.emails) {
                        emailList.push(...store.emails);
                    }
                    res.json({ emailList });
                } else {
                    console.log('Store not found.');
                    res.status(404).json({ error: 'Store not found' });
                }
            } else {
                console.log('District not found.');
                res.status(404).json({ error: 'District not found' });
            }
        } else {
            console.log('Region not found.');
            res.status(404).json({ error: 'Region not found' });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: e.message });
    }

});

router.get('/regions', async (req, res) => {
    try {
        const regionsCollection = db.collection('Regions'); // Reference the 'Regions' collection
        const regionSnapshot = await regionsCollection.get(); // Execute the query
        const regionList = regionSnapshot.docs.map(doc => doc.data());
        res.json({ regionList });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/regions', async (req, res) => {
    try {
        const REGIONS = req.body.REGIONS;
        const regionsCollection = db.collection('Regions'); // Reference the 'Regions' collection

        // Loop through the provided regions and add them to Firestore
        for (let i = 0; i < REGIONS.length; i++) {
            await regionsCollection.add(REGIONS[i]);
            console.log('Region document created successfully');
        }

        res.json({ message: 'Regions created successfully' });
    } catch (error) {
        console.error('Error creating region document: ', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;