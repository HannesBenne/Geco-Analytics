import { LightningElement } from 'lwc';
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { loadScript } from 'lightning/platformResourceLoader';
import sheetjs from '@salesforce/resourceUrl/sheetjs';
import saveTimeBookings from '@salesforce/apex/CtrGecoTimesheetUpload.saveTimeBookings';

const FIELDMAPPING = {
    "firstRow": "Monthly report",
    "bookingDate": "Monthly report",
    "employeeName": "__EMPTY",
    "jobOrd": "__EMPTY",
    "subOrd": "__EMPTY_1",
    "hours": "__EMPTY_2",
    "notes": "__EMPTY_4",
    "status": "__EMPTY_5"
}

const FIELDLENGHT_TEXT = 255;
const FIELDLENGHT_TEXTAREA = 4096;

export default class LwcGecoTimesheetUpload extends LightningElement {

    acceptedFormats = ['.xls', '.xlsx'];

    timeBookings = [];
    employeeName = '';
    isUploadEnabled = true;

    connectedCallback() {
        Promise.all([
            loadScript(this, sheetjs)
        ]).then(() => {
        }).catch(error => {
            console.log(error);
        });
    }

    /**
     * @description event handler for file input
     * @param {*} event 
     */
    handleUploadFinished(event){
        this.isUploadEnabled = false;
        const uploadedFiles = event.detail.files;
        if(uploadedFiles.length > 0) {   
            this.readExcel(uploadedFiles[0])
        }
    }

    /**
     * @desctiption read an excel file
     * @param {*} file 
     */
    readExcel(file){
        const reader = new FileReader();
        reader.onload = event => {
            const data = event.target.result;
            const workbook = XLSX.read(data, {
                type: 'binary',
                cellDates: true
            });
            const excelRowsObject = XLSX.utils.sheet_to_json(workbook.Sheets["Time Report"], {raw:false,dateNF:'mm"/"dd"/"YYYY'});
            this.processData(excelRowsObject);
        };
        reader.onerror = function(ex) {
            this.error=ex;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error while reding the file',
                    message: ex.message,
                    variant: 'error',
                }),
            );
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * @description parse excel row collection and send a list of geco wrapper objects to the backend
     * @param {*} excelRowsObject 
     */
    processData(excelRowsObject){

        excelRowsObject.forEach(row => {
            if(this.isNameRow(row)){
                this.employeeName = row[FIELDMAPPING.employeeName];
            }
            if(this.isTimebookingRow(row)){

                const jobOrd = row[FIELDMAPPING.jobOrd];
                const subOrd = row[FIELDMAPPING.subOrd]
                const externalKey = (jobOrd + ' - ' + subOrd).substring(0,FIELDLENGHT_TEXT);
                const bookingDate = new Date(row[FIELDMAPPING.bookingDate]);
                bookingDate.setHours(12);
                const employee = this.employeeName;
                const hours = parseFloat(row[FIELDMAPPING.hours]);
                const notes = row[FIELDMAPPING.notes]?.substring(0, FIELDLENGHT_TEXTAREA);
                const status = row[FIELDMAPPING.status];

                const timeBooking = {
                    jobOrder: jobOrd,
                    jobSubOrder: subOrd,
                    bookingDate: bookingDate,
                    employee: employee,
                    hours: hours,
                    notes: notes,
                    status: status,
                    key: externalKey
                }
                console.log(timeBooking.bookingDate);
                console.log(timeBooking.jobOrder);
                console.log(timeBooking.subOrd);
                console.log('***********')
                this.timeBookings.push(timeBooking);
            }

        });

        saveTimeBookings({timeBookings: [...this.timeBookings]})
            .then(data => {
                this.isUploadEnabled = true;
                this.showToast('Success', 'Import finished!', 'success');
            })
            .catch(error => {
                this.isUploadEnabled = true;
                this.showToast('Error', 'Import failed!', 'error');

            });

    }

    /**
     * @description show a toast notification
     * @param {*} title of the toast notification
     * @param {*} message of the toast notification 
     * @param {*} variant of the toast notification
     */
    showToast(title, message, variant){
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
          });
          this.dispatchEvent(evt);
    }


    /**
     * @description checks if the given row is a valid time booking
     * @param {*} row - row from geco time booking sheet
     */
    isTimebookingRow(row){
        const bookingDate = Date.parse(row[FIELDMAPPING.firstRow]);
        const jso = row[FIELDMAPPING.jobOrd];
        return !isNaN(bookingDate) && jso;

    }

    /**
     * @description check if the given row contains the employee name
     * @param {*} row - row from geco time booking sheet
     */
    isNameRow(row){
        return (row[FIELDMAPPING.firstRow] == 'Last Name')
    }


}