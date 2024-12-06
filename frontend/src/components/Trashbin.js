import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './TrashBin.css';

const MAX_DISTANCE = 22; // 17 cm is 100% full

function TrashBin() {
    const [distance, setDistance] = useState(null);
    const [latitude, setlatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [fullness, setFullness] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/waste-level');
                const { distance, latitude, longitude } = response.data;
                const calculatedFullness = Math.min(100, ((MAX_DISTANCE - distance) / MAX_DISTANCE) * 100);
                setDistance(distance);
                setlatitude(latitude);
                setLongitude(longitude)
                setFullness(calculatedFullness);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        // Fetch data every 5 seconds
        const intervalId = setInterval(fetchData, 5000);

        return () => clearInterval(intervalId);
    }, []);


    return (
        <div className="trash-bin-container">
            <div className="trash-bin">
                <div className="trash-fill" style={{ height: `${fullness}%` }}></div>
            </div>
            <p>Distance: {distance ? `${distance} cm` : 'Loading...'} </p>
            <p>Trash Fullness: {Math.round(fullness)}%</p>
            <p>Longitude - {longitude}</p>
            <p>Latitude -  {latitude}</p>
        </div>
    );
}

export default TrashBin;
