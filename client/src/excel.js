import React, { useState } from "react";
import * as XLSX from "xlsx";

function ExcelToJsonConverter() {
    const [file, setFile] = useState(null);
    const [jsonData, setJsonData] = useState(""); // this just displays to the user the JSON object
    var jsonFile = null;
    var IPGeolocationAPI = require('ip-geolocation-api-javascript-sdk/IPGeolocationAPI.js');
    var ipgeolocationApi = new IPGeolocationAPI("dc0f74a1574b4e0f89c55fe33dc2124a", true); // PUT YOUR API KEY HERE
    var GeolocationParams = require('ip-geolocation-api-javascript-sdk/GeolocationParams.js');
    var geolocationParams = new GeolocationParams();
    var maxLength = 50;
    geolocationParams.setLang('en');
    const handleConvert = () => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                // console.log(json); // each json row has [1]ip and [2]referer
                console.log(json);
                //setJsonData(JSON.stringify(json, null, 2));
                handleBulkGeolocationsLookup(json);
            };
            reader.readAsBinaryString(file);
        }
    };
    // Bulk Geolocations Lookup is 5 steps
    const handleBulkGeolocationsLookup = (jf) => {
        jsonFile = jf;
        // 1. Get the IP addresses from the JSON data
        var ipAddresses = Object.entries(jf).map(([key, value]) => {
            const ipAddress = value;
            const parsedIpAddress = ipAddress['IP'];
            if (ipAddress['IP'] !== undefined) {
                return parsedIpAddress;
            }
            return null;
        });
        // remove duplicate IP addresses
        const uniqueIpAddresses = [...new Set(ipAddresses)];
        ipAddresses = uniqueIpAddresses;
        console.log(ipAddresses);
        //geolocationParams.setFields('country_code3,state_prov');// Specify the required fields/objects for multiple IP addresses
        // if length is larger than maxLength, then split the array into multiple arrays of maxLength
        if (Object.entries(ipAddresses).length > maxLength) {
            console.log("The number of queries in the request is: " + Object.entries(ipAddresses).length);
            const splitArrays = [];
            while (ipAddresses.length > 0) {
                splitArrays.push(ipAddresses.splice(0, maxLength));
                console.log(splitArrays);
                // Query geolocation for multiple IP addresses and all fields
                geolocationParams.setIPAddresses(splitArrays);
                // 2. Get the state and country from the IP address
                ipgeolocationApi.getGeolocation(handleResponse, geolocationParams); // Result goes to handleResponse
            }
        } else {
            // Query geolocation for multiple IP addresses and all fields
            geolocationParams.setIPAddresses(ipAddresses);
            // 2. Get the state and country from the IP address
            ipgeolocationApi.getGeolocation(handleResponse, geolocationParams); // Result goes to handleResponse
        }
        setJsonData(JSON.stringify(jsonFile, null, 2)); // this just displays to the user the JSON object
        // 4. Put the JSON object into an Excel file
        const worksheet = XLSX.utils.json_to_sheet(jsonFile);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

        // 5. Download the Excel file
        const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "output.xlsx";
        link.click();

    };

    // Function to handle response from IP Geolocation API
    async function handleResponse(response) {
        console.log(response);
        if (response["message"]) {
            console.log(response["message"]);
            return;
        }
        // 3. For jsonData object (jsonFile), push response into the JSON object row as well
        for (var i = 0; i < jsonFile.length; i++) {
            const ipAddress = jsonFile[i]["ip"];
            const matchingResponse = response.find((res) => res["ip"] === ipAddress);
            if (matchingResponse) {
                jsonFile[i]["country_code3"] = matchingResponse["country_code3"];
                // If country_code3 == USA, then add the state_prov to the JSON object row as well
                if (matchingResponse["country_code3"] === "USA") {
                    jsonFile[i]["state_prov"] = matchingResponse["state_prov"];
                }
            }
        }
    }

    return (
        <div>
            <input
                type="file"
                accept=".xls,.xlsx"
                onInput={(e) => setFile(e.target.files[0])}
                onChange={handleConvert}
            />
            <pre>{jsonData}</pre>
        </div>
    );
}

export default ExcelToJsonConverter;
