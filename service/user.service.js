import qs from 'qs';
import { db } from "../firebase.js";
import { doc, setDoc, getDoc, arrayUnion, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";

export async function getGoogleOauthTokens(code) {
    const url = 'https://oauth2.googleapis.com/token'
    const values = {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URL,
        grant_type: 'authorization_code'
    }
    const urlWithParams = `${url}?${qs.stringify(values)}`
    try {
        const response = await fetch(urlWithParams, {
            method: 'POST',
            body: JSON.stringify(values),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const data = await response.json()
        console.log(data)
        return data
    } catch (e) {
        console.log(e)

    }
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

export async function getGoogleUser(id_token, access_token) {
    try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${id_token}`
            }
        })
        const data = await response.json()
        console.log(data)
        return data
    } catch (e) {
        console.log(e)
    }
}

export async function getFirebaseUser(userId, displayName) {
    try {
        const userRef = doc(db, "Users", userId);
        // Now you can fetch the data for the specific user document
        let returnedValue
        const docSnapshot = await getDoc(userRef);
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();;
            //console.log(userData)
            returnedValue = { ...userData }
            //res.json({ ...userData });
        } else {
            //console.log("User does not exist in firestore")
            //Come back to this when Auth is set up
            await setDoc(userRef, {
                displayName: displayName
                // Add any other user data fields here if needed
            });
            returnedValue = { userData: { displayName: displayName } }
            //res.json({ userData: { displayName: user.displayName } });
        }
        return returnedValue
    } catch (error) {
        console.log(error)
        //res.status(500).json({ error: error.message });
    }
}

//given the firebase Authentication User UID, get the user details from google
