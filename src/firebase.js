import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";

var firebaseConfig = {
  apiKey: "AIzaSyCEHy_kQMnBaFGNkz9WpmjncgNLdEf8TCs",
  authDomain: "react-slack-clone-7db5d.firebaseapp.com",
  projectId: "react-slack-clone-7db5d",
  storageBucket: "react-slack-clone-7db5d.appspot.com",
  messagingSenderId: "255873065487",
  appId: "1:255873065487:web:20f54781a08092ac45b97a",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default firebase;
