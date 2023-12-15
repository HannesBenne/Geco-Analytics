public with sharing class CtrGecoTimesheetUpload {

    @AuraEnabled
    public static void saveTimeBookings(List<GecoWrapper> timeBookings){
        
        if(!timeBookings.isEmpty()){
            Integer month = timeBookings.get(0).bookingDate.month();
            resetMonth(month);
        }else{
            return;
        }

        Map<String, GecoJSO__c> jsoMap = new Map<String, GecoJSO__c>();
        List<GecoTimeBooking__c> bookings = new List<GecoTimeBooking__c>();

        for(GecoWrapper booking : timeBookings){
            String key = booking.key;

            GecoJSO__c jso = null;
            if(!jsoMap.containsKey(key)){
                jso = new GecoJSO__c(
                    JobOrder__c = booking.jobOrder,
                    JobSubOrder__c = booking.jobSubOrder,
                    ExternalKey__c = key
                );
                jsoMap.put(key, jso);
            }else{
                jso = jsoMap.get(key);
            }

            bookings.add(new GecoTimeBooking__c(
                BookingDate__c = booking.bookingDate,
                Employee__c = booking.employee,
                GecoJSO__r = new GecoJSO__c(ExternalKey__c = key),
                Hours__c = booking.hours,
                Notes__c = booking.notes,
                Status__c = booking.status
            ));
        }

        Schema.SObjectField externalKey = GecoJSO__c.Fields.ExternalKey__c;

        Database.upsert(jsoMap.values(), externalKey, true, AccessLevel.USER_MODE);
        Database.insert(bookings, true, AccessLevel.USER_MODE);
        
    }

    private static void resetMonth(Integer month){
        delete [SELECT Id FROM GecoTimeBooking__c WHERE CALENDAR_MONTH(BookingDate__c)= :month];
    }

    public class GecoWrapper{
        
        @AuraEnabled
        public String jobOrder {get;set;}

        @AuraEnabled
        public String jobSubOrder {get;set;}
        
        @AuraEnabled
        public Date bookingDate {get;set;}

        @AuraEnabled
        public String employee {get;set;}

        @AuraEnabled
        public Decimal hours {get;set;}

        @AuraEnabled
        public String notes {get;set;}

        @AuraEnabled
        public String status {get;set;}

        @AuraEnabled
        public String key {get;set;}

    }
}