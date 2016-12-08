time_tracking_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        var str = ""; //error check
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_TimeTrack_LineItems_RowType)"; //include this for lineItems to save it in a separate table
        
        
        
        //Service/Task Request
        var serviceItemRequest = {
            'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Products?$format=json&$filter=Type ne 'Inventory' and Description eq " + "'" + bundle.action_fields.Task_Key + "'",
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"

        };
        var serviceItemResponse = z.request(serviceItemRequest);
        var JSONResponse = JSON.parse(serviceItemResponse.content);
        console.log('Task_Key: ' + outbound.Task_Key);

        if (JSONResponse.value.length > 0) {
            outbound.Task_Key = JSONResponse.value[0].Ref_Key;
        } else {
            outbound.Task_Key = "";
        }

        if(outbound.Task_Key === ""){
        str += "The task/service you entered doesn't exist. Please check 'AccountingSuite' software to find your task entry, or if needed, please use our 'Create_Services Zap' to create a new task. ";
        } 
        
        //Company Request
        if (outbound.Company_Key === undefined) {
            outbound.Company_Key = "00000000-0000-0000-0000-000000000000";
        } else {
            var companyRequest =  {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'", 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var companyResponse = z.request(companyRequest);
            JSONResponse = JSON.parse(companyResponse.content);
            //console.log('JSON_COMPANY: ' + companyResponse);

            if (JSONResponse.value.length > 0) {
                outbound.Company_Key = JSONResponse.value[0].Ref_Key;
                console.log('outbound.Company_Key: ' + outbound.Company_Key);
            }
            else {
                outbound.Company_Key = "";
            }

            if (outbound.Company_Key === ""){
                str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer. ";
            } 

        }
        
  
      //user request
      if (outbound.User_Key === undefined) {
            outbound.User_Key = '00000000-0000-0000-0000-000000000000';
      } else {
           var userRequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_UserList?$format=json&$filter=Description eq " + "'" + bundle.action_fields.User_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
           };
        var userResponse = z.request(userRequest);
        JSONResponse = JSON.parse(userResponse.content);
        console.log('User_Key: ' + outbound.User_Key);

        if (JSONResponse.value.length > 0) {
            outbound.User_Key = JSONResponse.value[0].Ref_Key;
        } else {
            outbound.User_Key = '';
        }
        if (outbound.User_Key === ""){
            str += "The user you entered doesn't exist. Please check 'AccountingSuite' software to create a new user. ";
        } 
      }
       
       
        //billable default No
        if (outbound.Billable === undefined){
            outbound.Billable = false;
        }
        
        
        //Project request
        var projectRequest = {
        'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
            "/odata/standard.odata/Catalog_Projects?$format=json&$filter=Description eq " + "'" + bundle.action_fields.Project_Key + "'",
        'headers' : {
            "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
        },
        'method' : "GET"
        };
        var projectResponse = z.request(projectRequest);
        JSONResponse = JSON.parse(projectResponse.content);
        console.log('project_Key: ' + outbound.Project_Key);

        if (JSONResponse.value.length > 0) {
            outbound.Project_Key = JSONResponse.value[0].Ref_Key;
        } 
        
        if (outbound.Project_Key === undefined) {
            outbound.Project_Key = "00000000-0000-0000-0000-000000000000";
        }
        
        
        //Class request
        var classRequest = {
        'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
            "/odata/standard.odata/Catalog_Classes?$format=json&$filter=Description eq " + "'" + bundle.action_fields.Class_Key + "'",
        'headers' : {
            "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
        },
        'method' : "GET"
        };
        var classResponse = z.request(classRequest);
        JSONResponse = JSON.parse(classResponse.content);
        console.log('class_Key: ' + outbound.Class_Key);

        if (JSONResponse.value.length > 0) {
            outbound.Class_Key = JSONResponse.value[0].Ref_Key;
        } 
        
        if (outbound.Class_Key === undefined) {
            outbound.Class_Key = "00000000-0000-0000-0000-000000000000";
        }
        
        
        //invoice status default 'unbilled'
        
        if (outbound.InvoiceStatus === undefined) {
            outbound.InvoiceStatus = "Unbilled";
        }
        
        //Sales Invoice request by SI Number
        /*if (outbound.SalesInvoice_Key === undefined) {
            outbound.SalesInvoice_Key = "00000000-0000-0000-0000-000000000000";
            outbound.InvoiceDate = '0001-01-01T00:00:00';
            outbound.InvoiceSent = '';
        } else {
            var SIRequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Document_SalesInvoices?$format=json&$filter=Number eq " + "'" + bundle.action_fields.SalesInvoice_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
            };
            var SIResponse = z.request(SIRequest);
            JSONResponse = JSON.parse(SIResponse.content);
            console.log('SI_Key: ' + outbound.SalesInvoice_Key);

            if (JSONResponse.value.length > 0) {
                outbound.SalesInvoice_Key = JSONResponse.value[0].Ref_Key;
            }
            outbound.InvoiceDate = JSONResponse.value[0].Date;
            outbound.InvoiceSent = '';
        }*/

        
        //Sales Order request by SO Number
        //how to setup a condition to check if the SO key exists?
        if (outbound.SalesOrder_Key === undefined) {
            outbound.SalesOrder_Key = "00000000-0000-0000-0000-000000000000";
        } else {
            var SORequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Document_SalesOrder?$format=json&$filter=Number eq " + "'" + bundle.action_fields.SalesOrder_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
            };
            var SOResponse = z.request(SORequest);
            JSONResponse = JSON.parse(SOResponse.content);
            console.log('SO_Key: ' + outbound.SalesOrder_Key);

            if (JSONResponse.value.length > 0) {
                outbound.SalesOrder_Key = JSONResponse.value[0].Ref_Key;
            } else {
                 outbound.SalesOrder_Key = "";
            }

            if (outbound.SalesOrder_Key === ""){
                str += "The SalesOrder code you entered doesn't exist. Please check 'AccountingSuite' software to find the code of an existing Sales Order. ";
            }
        }
        
        
        //Date
        var dateString = '';
        var dateObj = {};
        var momentObj = moment(dateObj);
   
        
        if (outbound.Date === undefined){
            dateObj = moment();
            outbound.Date = momentObj.format();
            console.log("Date: " + outbound.Date);
        } else {
            dateString = outbound.Date;
            var dateFromString = outbound.DateFrom;
            dateObj = new Date(dateString);
            outbound.Date = momentObj.format();
            console.log("Date: " + outbound.Date);
        }
        
        if (outbound.DateFrom === undefined){
            returnEmptyDate(outbound.DateFrom);
            console.log("DateFrom: " + outbound.DateFrom);
        } 
        
        
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }


        //stringify**********************************
        bundle.request.data = JSON.stringify(outbound);
        //console.log(bundle.request.data);
        return bundle.request; 
        
    },
