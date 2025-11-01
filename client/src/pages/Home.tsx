import React, {useEffect, useState} from "react";

interface UserData{
    id: number,
    name: string,
    image_url: string
}
export default function Home(){
    const [data, setData] = useState<UserData[]>();
    const [newName, setNewName] = useState("");

    // get data from server
    useEffect(()=> {
        fetch("http://localhost:3001/user")
            .then((res) => res.json())
            .then((json: UserData[]) => setData(json));
    }, []);

    const addPerson = async () =>{
        if (!newName.trim()) return;
        await fetch("http://localhost:3001/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName })
        })
    };

    if ( data ) 
        console.log("here is "+ data[0].image_url);
    return(
        <div>
            <h2> this is home page </h2>
            <h1> hi there! </h1>
            {data ? (
                <ul>
                    {data.map((user) => (
                        <li key={user.id}>
                            {user.name}
                            <img 
                                src={user.image_url}
                                width="500"
                                height="500" 
                            />
                        </li>
                    ))}
                </ul>
            ) : (
                <p> no data found </p>
            )}
            <input
                type="text"
                value={newName}
                onChange={ (e) => setNewName(e.target.value) }
                placeholder = "Enter new name..."
            />
            <button onClick={addPerson}> Add Person </button>
        </div>
    );
}
