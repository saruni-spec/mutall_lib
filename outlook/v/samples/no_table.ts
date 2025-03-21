//Nothing should sho. and no error
import {homozone, driver_source, obj} from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async()=>{
    //
    //Define an empty driver source
    const driver_source:driver_source = {type:'obj', obj:{}}
    //
    //Use teh driver source to create a homozone
    const zone = new homozone(driver_source);
    //
    //Now show the zone
    await zone.show();
    //
    //Alert teh user
    alert('Ok');
}
