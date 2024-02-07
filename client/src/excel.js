import React, { useState } from "react";
import * as XLSX from "xlsx";

function ExcelToJsonConverter() {
    const [file, setFile] = useState(null);
    const [jsonData, setJsonData] = useState(""); // this just displays to the user the JSON object
    var jsonFile = null;
    var maxLength = 45;
    var response = null; // this is the response from the API
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
    async function handleBulkGeolocationsLookup(jf) {
        // make jf only have unique entries inside the json.
        var unique = {};
        var distinct = [];
        for (var i in jf) {
            if (typeof unique[jf[i]['IP']] == "undefined") {
                distinct.push(jf[i]);
            }
            unique[jf[i]['IP']] = 0;
        }
        jf = distinct;
        console.log(jf);
        // 1. Get the IP addresses from the JSON data
        for (const [key, value] of Object.entries(jf)) {

            await new Promise((resolve) => setTimeout(resolve, 625));
            
            const row = value;
            if (row['IP'] !== undefined) {
                const endpoint = `http://ip-api.com/json/${row['IP'].trim()}?fields=status,message,countryCode,regionName`;
                const xhr = new XMLHttpRequest();
                xhr.open("GET", endpoint, true);
                xhr.onreadystatechange = function () {
                    response = xhr;
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);
                        console.log(data);
                        if (data["status"] === "fail") {
                            console.log(data["message"]);
                        } else {
                            jf[key]['countryCode'] = data['countryCode'];
                            if (data['countryCode'] === "US") {
                                jf[key]['regionName'] = data['regionName'];
                            }
                        }
                        console.log(jf[key]);
                    }
                };
                xhr.send();
                // if 429 too many requests, wait 60 seconds
                if (xhr.status === 429) {
                    console.log("Waiting 60 seconds to avoid rate limiting");
                    await new Promise((resolve) => setTimeout(resolve, 60000));
                }
                console.log(response);
            }
        }
        console.log(jf);
        jsonFile = jf;
        setJsonData(JSON.stringify(jf, null, 2));
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
