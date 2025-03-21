//
//Use case:When you have some data (or none at all)
//Demonstrate source of axes (by re-writing labeled_matrix)
//Concepts
//-options (for homozones)
//options_of_axis
//options_of_axis/axis_source
import { homozone } from "../zone/zone.js";
//
//On loading the sample page....
window.onload = async () => {
    //
    //The  source of row axis values
    const row = ['A', 'B', 'C', 'D'];
    // 
    //The source of column axis 
    const col = ['1', '2', '3'];
    //
    //The data source as a matrix
    const data = {
        A: { '1': 'A1', '2': 'A2' },
        B: { '1': 'B1', '2': 'B2' },
        C: { '1': 'C1', '2': 'C2' }
    };
    //
    //Define the driver source as a matrix
    const driver_source = { type: 'obj', obj: data };
    //
    //Options for axes
    const axes = [{ source: row }, { source: col }];
    //
    //Set the homozone options
    const options = { axes };
    //
    //Create a zone of basic values
    const zone = new homozone(driver_source, options);
    //
    //Now show the zone
    await zone.show();
};
