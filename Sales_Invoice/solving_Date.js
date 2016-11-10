
//DueDate = DueDate.split('.')[0];
        /*var curr_date = d.getUTCDate();
        var curr_time_ms = curr_date.getTime();//time in ms
        //var month = d.getUTCMonth() + 1; //month starts at 0
        //var year = d.getUTCFullYear();
        var adjusted_time_ms = curr_time_ms + terms_Days*24*60*60*1000;
        var adjusted_DueDate = new Date(adjusted_time_ms);
        outbound.DueDate = adjusted_DueDate.toISOString();
        console.log(outbound.DueDate);*/
        
        /*var toDateTime = function(secs){
            var t = new Date(year, month, day); //Epoch
            t.setSeconds(secs);
            return t.toISOString();
        };*/
        
        /*var DueDate = toDateTime(adjusted_days);
        outbound.DueDate = DueDate.split('.')[0];
        console.log(outbound.DueDate);*/
        
        /*//var Day = outbound.Date.split('T').split('-')[3];
        //var EmptyDate = '00010101';
        if (JSONResponse.Terms_Key !== ''){
            //var adjusted = d.getUTCDate() + terms_Days;
            var Day = outbound.Date.split('T').split('-')[3];
            var adjusted = Day + terms_Days;
            console.log('adjusted: '+ adjusted);
            DueDate = new Date(adjusted).toISOString();
        }
        console.log('duedate: '+ DueDate);*/



//dueDate = dueDate.toJSON();
        console.log('dueDate: ' + dueDate);
        
        /*var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var dateParse = function(val){
            var str = val.toString();
            return (str.length < 2)? "0" + str:str;
        };
        var dateString = [dateParse(month), dateParse(dueDate),year].join("/");
        console.log(dateString);*/
        
        
        /*
        // Define empty date.
         EmptyDate = '00010101';
 
         // Update due date basing on the currently selected terms.
         Object.DueDate = ?(Not Object.Terms.IsEmpty(), Object.Date + Object.Terms.Days * 60*60*24, EmptyDate);
        */
        
        
        /*var y = myDate.getFullYear(),
        m = myDate.getMonth() + 1, // january is month 0 in javascript
    d = myDate.getDate();
var pad = function(val) { var str = val.toString(); return (str.length < 2) ? "0" + str : str};
dateString = [y, pad(m), pad(d)].join("-");
        console.log(dueDate);*/
        
        
        /*	
        var dt = new Date( Date.UTC(2012, 9, 21, 8, 5, 12));
        alert( (dt.getUTCMonth()+1) + '/' + dt.getUTCDate() + '/' + 
        dt.getUTCFullYear() + " " + dt.getUTCHours()+ ':' + 
        dt.getUTCMinutes() + ':' + dt.getUTCSeconds() );
        
            var myDate = new Date();

            //add a day to the date
            myDate.setDate(myDate.getDate() + 1);*/
        
        /*var addDays = function(date,terms_Days){
            var time_zone_offset = date.getTimeZoneOffset()*60*1000, //timezoneoffset in minutes
            current_Time = date.getTime();
        
        };*/
        //ref: http://stackoverflow.com/questions/3674539/incrementing-a-date-in-javascript/3674559#3674559
        /*
        function addDays(date, amount) {
          
            var tzOff = date.getTimezoneOffset() * 60 * 1000,
            t = date.getTime(),
            d = new Date(),
            tzOff2;

          t += (1000 * 60 * 60 * 24) * amount;
          d.setTime(t);

          tzOff2 = d.getTimezoneOffset() * 60 * 1000;
          if (tzOff != tzOff2) {
            var diff = tzOff2 - tzOff;
            t += diff;
            d.setTime(t);
          }

          return d;
        }

        */
        //due = d.getDate() + Number(JSONResponse.Days)