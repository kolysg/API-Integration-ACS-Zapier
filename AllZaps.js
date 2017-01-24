'use strict';

function randomStringGen(len, charSet){
    charSet = charSet || 'abcdef0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
      var randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

function returnEmptyDate(outboundDate) {
    outboundDate = "0001-01-01T00:00:00";
}
        
function keyUndefined(outboundKey) {
    if (outboundKey === undefined) {
        outboundKey = "00000000-0000-0000-0000-000000000000";
    }    
}

function returnEmptyString(outboundVal) {
    if (outboundVal === undefined) {
        outboundVal = "";
    }
}

var LineId_Key = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) ); //creates random (8-4-4-4-12 digit) LineID String

var Zap = {

    create_company_post_poll: function(bundle) {
        
        var results = JSON.parse(bundle.response.content);
  
        results.value.reverse();
        _.each(results.value, function(result) {
          result.id = result.Ref_Key;
          /*console.log('result:' + result);*/
        });
        
        return results;
    },

    cash_receipt_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        //console.log(results);
        var cash_receipt_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_CashReceipt(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        var cash_receipt_post_Response = z.request(cash_receipt_post_request); 
    },
     

//Bills Post Write
    create_bills_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        var create_bills_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_PurchaseInvoice(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        
        var create_bills_post_Response = z.request(create_bills_post_request);
    },

//Bills PreWrite ****************************************************************************************************** ******************************
    create_bills_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_PurchaseInvoice_LineItems_RowType)";
        
        //error check for Company bad input
        var str = "";


        //vendor request
        var vendorRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Companies?$format=json&$filter=Vendor eq true and Description eq " + "'" + bundle.action_fields.Company_Key + "'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var vendorResponse = z.request(vendorRequest);
        var JSONResponse = JSON.parse(vendorResponse.content);
        console.log('vendorResponse'+ vendorResponse.content);
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
            console.log('company_key: ' + JSONResponse.value[0].Ref_Key); 
        }
        else {
            outbound.Company_Key = "";
        }
        
        if (outbound.Company_Key === ""){
            str += "The vendor you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create Company Zap' to create a new vendor. ";
        } 
        

        //Address default is Primary
        if (outbound.CompanyAddress_Key === undefined) {
            var DefaultAddressRequest =  {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=Description eq 'Primary' and Owner_Key eq guid'" + outbound.Company_Key + "'", 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
              };
            var DefaultAddressResponse = z.request(DefaultAddressRequest);
            JSONResponse = JSON.parse(DefaultAddressResponse.content); 
            outbound.CompanyAddress_Key = JSONResponse.value[0].Ref_Key;
            console.log('default address' + outbound.CompanyAddress_Key);
        } else {
            str+=  "The address you entered doesn't exist. Please check 'AccountingSuite' software to find your address entry, or if needed, please use our 'Create Address/Contact Zap' to create a new address. ";
            keyUndefined(outbound.Company_Key);
            /*var companyAddressRequest =  {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=Description eq '" + bundle.action_fields.CompanyAddress_Key + "'" , 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
              };
            var companyAddressResponse = z.request(companyAddressRequest);
            JSONResponse = JSON.parse(companyAddressResponse.content); 
            outbound.CompanyAddress_Key = JSONResponse.value[0].Ref_Key;
            console.log('default address' + outbound.CompanyAddress_Key);*/
        }
        

        //shipto location address
        //If user doesn't specify ship_to address, use the default address -- By default value is added in the UI- No need
        console.log('locationKey: ' + outbound.LocationActual_Key);
        
        if (outbound.LocationActual_Key === undefined){
            var defaultLocationRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
                };
            var defaultLocationResponse = z.request(defaultLocationRequest);
            JSONResponse = JSON.parse(defaultLocationResponse.content);
            //console.log(JSONResponse);
            outbound.LocationActual_Key = JSONResponse.value[0].Ref_Key;
        } /*else {
            var shiptoLocationRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations?$format=json&$filter=Description eq '" + bundle.action_fields.LocationActual_Key + "'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "POST"
                };
            var shiptoLocationResponse = z.request(shiptoLocationRequest);
            JSONResponse = JSON.parse(shiptoLocationResponse.content);
            console.log('shiptoAddressResponse: ' + shiptoLocationResponse.content);
            outbound.LocationActual_Key = JSONResponse.value[0].Ref_Key;
        } */


        //Bill date
        var dateString = '';
        var dateObj = {};
        var momentObj = moment(dateObj);
        
        if (bundle.action_fields.Date === undefined){
            dateObj = moment();
            outbound.Date = momentObj.format();
            console.log("Date: " + outbound.Date);
        } else {
            dateString = outbound.Date;
            dateObj = new Date(dateString);
            outbound.Date = momentObj.format();
            console.log("Date: " + outbound.Date);
        }
        
        //Due Date based on Terms
        var TermsRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_PaymentTerms(guid'" + outbound.Terms_Key + "')?$format=json", //since inside zap, the key already exists in the action_field, grabbing that with guid
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var TermsResponse = z.request(TermsRequest);
        JSONResponse = JSON.parse(TermsResponse.content);
        console.log(JSONResponse.Days);
        var terms_days = (Number(JSONResponse.Days));
        console.log('terms_days: ' + terms_days);
        
        if (outbound.Terms_Key === undefined){
            terms_days = 30;
            keyUndefined(outbound.Terms_Key);
        }
        
        var adjusted_days = momentObj.add(terms_days, 'days');
        //console.log("adjusted_days: ", adjusted_days);
        outbound.DueDate = adjusted_days.format();
        console.log("DueDate: " + outbound.DueDate);
        
        
        //default dates
        if (outbound.DeliveryDate === undefined) {
            returnEmptyDate(outbound.DeliveryDate);
        }
        outbound.DeliveryDate = outbound.DeliveryDateActual;

        //default functions
        

        if (outbound.Terms_Key === undefined) {
            keyUndefined(outbound.Terms_Key);
        }
         
        if (outbound.Project_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Project_Key);
        }
        
        if (outbound.Class_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Class_Key);
        }
        
        keyUndefined(outbound.Carrier_Key);
        keyUndefined(outbound.TrackingNumber);
        returnEmptyString(outbound.URL);
        returnEmptyString(outbound.Memo);
         

        //total calculation
        var doc_subtotal = 0;
        var i;
        var j = bundle.action_fields.LineItems;
        
        for (i = 0; i < j.length; i++){
            
            ////Product Request
            var productRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + j[i].Product_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };
            var productResponse = z.request(productRequest);
            JSONResponse = JSON.parse(productResponse.content);
            
            if (JSONResponse.value.length === 0){
                outbound.LineItems[i].Product_Key = "";
            }
            
            if(outbound.LineItems[i].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product. ";
            }
            else{
                //LineItems               
                outbound.LineItems[i].LineID = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) );
                outbound.LineItems[i].LineNumber = i+1;
                outbound.LineItems[i].ProductDescription = JSONResponse.value[0].Description;
                outbound.LineItems[i].Product_Key = JSONResponse.value[0].Ref_Key; //Products
                outbound.LineItems[i].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unitset
                outbound.LineItems[i].QtyUM = outbound.LineItems[i].QtyUnits; //Quantity
                outbound.LineItems[i].LocationActual_Key = outbound.LocationActual_Key;
                outbound.LineItems[i].Location_Key = outbound.LocationActual_Key; // for LineItem's location
                outbound.LineItems[i].Project_Key = outbound.Project_Key;//Line Item's Projects
                outbound.LineItems[i].Class_Key = outbound.Class_Key;//Line Item's Class
                outbound.LineItems[i].DeliveryDate = outbound.DeliveryDateActual; //Promise Date
                outbound.LineItems[i].DeliveryDateActual = outbound.DeliveryDateActual;
                outbound.LineItems[i].OrderPriceUnits = outbound.LineItems[i].PriceUnits;
                //LineTotal & LineSubtotal
                outbound.LineItems[i].LineTotal = outbound.LineItems[i].PriceUnits * outbound.LineItems[i].QtyUnits; //Total Price
                doc_subtotal += outbound.LineItems[i].LineTotal; //LineTotal = LineItemTotal, in UI, it's 'Lines'
                console.log('Doc_subTotal: ' + doc_subtotal);
            }
            
            //Unit Request - Default
            var unitRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[i].UnitSet_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };

            var unitResponse = z.request(unitRequest);
            JSONResponse = JSON.parse(unitResponse.content);
            outbound.LineItems[i].Unit_Key = JSONResponse.DefaultSaleUnit_Key;
            
        }

        //Document Total
        outbound.DocumentTotal = doc_subtotal;
        outbound.DocumentTotalRC = outbound.DocumentTotal;


    //error check for Company & Product
        if (str !== ""){
           //console.log(str);
           throw new ErrorException(str);
        }
        
        //*****bundle stringify****************************
        bundle.request.data = JSON.stringify(outbound);
        console.log(bundle.request.data);
        return bundle.request;
    },



//time tracking post write
    time_tracking_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        //console.log(results);
        var time_tracking_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_TimeTrack(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        
        var time_tracking_post_Response = z.request(time_tracking_post_request);
        
    },
    
    
//time tracking pre write ****************************************************************************************************** ******************************
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



//projects/jobs pre-write **************************************************************************************************************************************************************************
    create_project_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        var str = ""; // check
        
    //Company Request
        var customerRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq " + "'" + bundle.action_fields.Customer_Key + "'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var customerResponse = z.request(customerRequest);
        var JSONResponse = JSON.parse(customerResponse.content);
        console.log('customerResponse'+ JSONResponse);
        if (JSONResponse.value.length > 0) {
            outbound.Customer_Key = JSONResponse.value[0].Ref_Key;
            console.log('Customer_Key: ' + JSONResponse.value[0].Ref_Key); 
        }
        else {
            outbound.Customer_Key = "";
        }
        
        if (outbound.Customer_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } 
        
        //Ref#
        if (outbound.Description === undefined) {
             outbound.Description = '';
        }
        
        //status
        if (outbound.Status === undefined) {
            outbound.Status = '';   
        } 
        
        if (outbound.Type === undefined) {
            outbound.Type = '';
        }
     
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }
            
        console.log('Description: ' + outbound.Description);
        
        
        //stringify**********************************
        bundle.request.data = JSON.stringify(outbound);
        //console.log(bundle.request.data);
        return bundle.request;  
    },
    
    
//Purchase Order Post Write
    purchase_order_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        //console.log(results);
        var purchase_order_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_PurchaseOrder(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        
        var purchase_order_post_Response = z.request(purchase_order_post_request);
    },
   


//Purchase Order Pre Write ****************************************************************************************************** ******************************************************************************************************
    purchase_order_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_PurchaseOrder_LineItems_RowType)"; //include this for lineItems to save it in a separate table
        console.log('bundle' + bundle.request.data);
        console.log('company_key: ' + bundle.action_fields.Company_Key);
        var str = ""; //error check
        
    //Company Request
        var vendorRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Companies?$format=json&$filter=Vendor eq true and Description eq " + "'" + bundle.action_fields.Company_Key + "'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
          };
        var vendorResponse = z.request(vendorRequest);
        var JSONResponse = JSON.parse(vendorResponse.content);
        console.log('vendorResponse'+ vendorResponse.content);
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
            console.log('company_key: ' + JSONResponse.value[0].Ref_Key); 
        }
        else {
            outbound.Company_Key = "";
        }
        
        if (outbound.Company_Key === ""){
            str += "The vendor you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new vendor.";
        } 
        
        //Address default is Primary
        if (outbound.CompanyAddress_Key === undefined) {
            var DefaultAddressRequest =  {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=Description eq 'Primary' and Owner_Key eq guid'" + outbound.Company_Key + "'", 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
              };
            var DefaultAddressResponse = z.request(DefaultAddressRequest);
            JSONResponse = JSON.parse(DefaultAddressResponse.content); 
            outbound.CompanyAddress_Key = JSONResponse.value[0].Ref_Key;
            console.log('default address' + outbound.CompanyAddress_Key);
        } else {
            str+=  "The address you entered doesn't exist. Please check 'AccountingSuite' software to find your address entry, or if needed, please use our 'Create Address/Contact Zap' to create a new address.";
            keyUndefined(outbound.Company_Key);
        }
        
        //always USD and exchange rate of 1
        var currencyRequest =  {
            'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Currencies?$format=json&$filter=Description eq 'USD'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
          };
        var currencyResponse = z.request(currencyRequest);
        JSONResponse = JSON.parse(currencyResponse.content);
        outbound.Currency_Key = JSONResponse.value[0].Ref_Key;
        outbound.ExchangeRate = 1;
        

        //Date
        var d = moment();
        var n = d.format();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }

        //shipto location address
        //If user doesn't specify ship_to address, use the default address -- By default value is added in the UI- No need
        if (outbound.Location_Key === undefined && outbound.Company_Key !== ''){
            var defaultLocationRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
                };
            var defaultLocationResponse = z.request(defaultLocationRequest);
            JSONResponse = JSON.parse(defaultLocationResponse.content);
            //console.log(JSONResponse);
            outbound.Location_Key = JSONResponse.value[0].Ref_Key;
        } else {
            var locationRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations((guid'" + outbound.Location_Key + "')?$format=json",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "POST"
                };
            var locationResponse = z.request(locationRequest);
            JSONResponse = JSON.parse(locationResponse.content);
            console.log('addressResponse: ' + locationResponse.content);
            outbound.Location_Key = JSONResponse.Ref_Key;
        } 
        
        
        //total calculation
        var doc_subtotal = 0;
        console.log(bundle.action_fields.LineItems);
        var i;
        var j = bundle.action_fields.LineItems;
        
        for (i = 0; i < j.length; i++){
            
            ////Product Request
            var productRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[i].Product_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };
            var productResponse = z.request(productRequest);
            JSONResponse = JSON.parse(productResponse.content);
            
            if (JSONResponse.value.length === 0){
                outbound.LineItems[i].Product_Key = "";
            }
            
            if(outbound.LineItems[i].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
            }
            else{
                //LineItems               
                outbound.LineItems[i].LineID = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) );
                outbound.LineItems[i].LineNumber = i+1;
                outbound.LineItems[i].ProductDescription = JSONResponse.value[0].Description;
                outbound.LineItems[i].Product_Key = JSONResponse.value[0].Ref_Key; //Products
                outbound.LineItems[i].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
                outbound.LineItems[i].QtyUM = outbound.LineItems[i].QtyUnits; //Quantity
                outbound.LineItems[i].Location_Key = outbound.Location_Key; // for LineItem's location
                outbound.LineItems[i].Project_Key = outbound.Project_Key;//Line Item's Projects
                outbound.LineItems[i].Class_Key = outbound.Class_Key;//Line Item's Class
                outbound.LineItems[i].DeliveryDate = outbound.DeliveryDate; //Promise Date
                //LineTotal & LineSubtotal
                outbound.LineItems[i].LineTotal = outbound.LineItems[i].PriceUnits * outbound.LineItems[i].QtyUnits; //Total Price
                doc_subtotal += outbound.LineItems[i].LineTotal; //LineTotal = LineItemTotal, in UI, it's 'Lines'
                console.log('Doc_subTotal: ' + doc_subtotal);
            }
            
            
            /*//Lines Total
            outbound.Linetotal = line_subtotal.toString();
            console.log('LinesTotal: ' + outbound.Linetotal);*/
            
            
            //Unit Request - Default
            var unitRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[i].UnitSet_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };

            var unitResponse = z.request(unitRequest);
            JSONResponse = JSON.parse(unitResponse.content);
            outbound.LineItems[i].Unit_Key = JSONResponse.DefaultSaleUnit_Key;
            
        }

        //Document Total
        outbound.DocumentTotal = doc_subtotal;
        outbound.DocumentTotalRC = outbound.DocumentTotal;


        //error check
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }
            
        
        //stringify**********************************
        bundle.request.data = JSON.stringify(outbound);
        //console.log(bundle.request.data);
        return bundle.request;  
    },


//Cash receipt********************************** ******************************************************************************************************
    cash_receipt_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_CashReceipt_LineItems_RowType)";
        //error check for Company bad input
        var str = "";
        
        //cash receipt date
        var date;
        if (outbound.Date === undefined) {
            var d = moment();
            console.log('moment: '+ d);
            var n = d.format();
            date = n.split('.');
            console.log('date: '+ date);
            outbound.Date = date[0];
        } else {
           outbound.Date = outbound.Date; 
        }
        
        //Customer Request
        var companyRequest =  {
            'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var companyResponse = z.request(companyRequest);
        var JSONResponse = JSON.parse(companyResponse.content);
       
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
        } else {
            outbound.Company_Key = "";
        }
        
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        }
        
        //Payment method
        /*if (outbound.PaymentMethod_Key === undefined) {
            outbound.PaymentMethod_Key = '';
        }*/
        
        //Ref#
        if (outbound.RefNum === undefined) {
             outbound.RefNum = '';
        }
    
        //Bank Account 
        if (outbound.BankAccount_Key === undefined) {
            var defaultbankRequest = {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                        "/odata/standard.odata/ChartOfAccounts_ChartOfAccounts?$format=json&$filter=Description eq 'Undeposited Funds'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var defaultbankResponse = z.request(defaultbankRequest);
            JSONResponse = JSON.parse(defaultbankResponse.content); 
            console.log("defaultbankResponse: " + JSONResponse);
            outbound.BankAccount_Key = JSONResponse.value[0].Ref_Key;
            //outbound.BankAccount_Key = JSONResponse.Ref_Key;
            outbound.DepositType = "1";
            
        } else {
            var bankRequest = {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                        "/odata/standard.odata/ChartOfAccounts_ChartOfAccounts(guid'" + outbound.BankAccount_Key + "')?$format=json",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET" 
            };
            var bankResponse = z.request(bankRequest);
            JSONResponse = JSON.parse(bankResponse.content); 
            console.log(JSONResponse);
            
            console.log("description:" + JSONResponse.Description);
            if (JSONResponse.Description === 'Undeposited Funds'){
                outbound.DepositType = '1';
            } else {
                outbound.DepositType = '2';
            }
        }
        
        
        //Memo
        if (outbound.Memo === undefined) {
            outbound.Memo = "";
        }

        //Line Items
        var i;
        var j = bundle.action_fields.LineItems;
        //var TotalDiscount;
        var TotalInvoices = 0;
        //var TotalCredit;
        console.log('outbound.LineItems: ' + outbound.LineItems);
        for (i = 0; i < j.length; i++){
            outbound.LineItems[i].LineNumber = (i + 1).toString();
            //outbound.LineItems[i].Payment = outbound.CashPayment;
            outbound.LineItems[i].Document_Type = "StandardODATA.Document_SalesInvoice";

            //Document Request
            
            //If it's a sales invoice
            var DocumentRequest = {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                        "/odata/standard.odata/Document_SalesInvoice?$format=json&$filter=Number eq '" + bundle.action_fields.LineItems[i].Document + "'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var DocumentResponse = z.request(DocumentRequest);
            JSONResponse = JSON.parse(DocumentResponse.content);
            
            outbound.ARAccount_Key = JSONResponse.value[0].ARAccount_Key;
            outbound.LineItems[i].Document = JSONResponse.value[0].Ref_Key;
            
            if (outbound.LineItems[i].Document === undefined) { //What happens here?
                str += "Please enter a valid Sales Invoice Number which this Cash Receipt is for";
            }
            
            /*if (outbound.LineItems[i].Payment === undefined) { //What happens here?
               outbound.LineItems[i].Payment = JSONResponse.value[0].DocumentTotal;
            }*/
            outbound.LineItems[i].Payment = JSONResponse.value[0].DocumentTotal;
            console.log("LineItem Payment: " + outbound.LineItems[i].Payment);
            TotalInvoices += outbound.LineItems[i].Payment;
            console.log("TotalInvoices: " + TotalInvoices);
        }
        
        //compare cash payment with TotalInvoices
        if (outbound.CashPayment < TotalInvoices) {
            outbound.CashPayment = TotalInvoices ;
        }
        
        outbound.InvoicesCreditsSelected = TotalInvoices;
        outbound.UnappliedPayment = outbound.CashPayment - outbound.InvoicesCreditsSelected;
        
        outbound.DocumentTotal = outbound.CashPayment;
        outbound.DocumentTotalRC = outbound.DocumentTotal;
        console.log('outbound.CashPayment: ' + outbound.CashPayment);
        
        /*//TotalCredit - separate API Call for TotalCredit from Credit Memo- a separate document
        //var TotalCreditRequest = 
        //outbound.CreditMemos = [];
        //TotalCredit = 0;

        //Unapplied Payment
        //outbound.UnappliedPayment = outbound.CashPayment + TotalCredit - TotalInvoices;
        //outbound.InvoicesCreditsSelected = outbound.CashPayment - outbound.UnappliedPayment;
       
       //Document Total
        //outbound.DocumentTotal = outbound.CashPayment + TotalCredit + TotalDiscount;
        outbound.DocumentTotal = outbound.DocumentTotalRC;*/
        
        //error check for Company & Product
        if (str !== ""){
           //console.log(str);
           throw new ErrorException(str);
        }
        
         //*****bundle stringify****************************
        bundle.request.data = JSON.stringify(outbound);
        console.log(bundle.request.data);
        return bundle.request;
    },


    //Sales_Invoice_Pre_Write****************************************************************************************************************************************************************************************************
    sales_invoice_pre_write: function(bundle) {
    
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesInvoice_LineItems_RowType)";
        //Alan added 11-18-16
        outbound.DiscountTaxability = "NonTaxable";
        
        //error check for Company bad input
        var str = "";
        
        //invoice date
        var date;
        if (outbound.Date === undefined) {
            var d = moment();
            console.log('moment: '+ d);
            var n = d.format();
            date = n.split('.');
            console.log('date: '+ date);
            outbound.Date = date[0];
        } else {
           outbound.Date = outbound.Date; 
        }
        
        //Customer Request
        var companyRequest =  {
            'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var companyResponse = z.request(companyRequest);
        var JSONResponse = JSON.parse(companyResponse.content);
       
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
        } else {
            outbound.Company_Key = "";
        }
        
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } 
        
        if (outbound.Terms_Key === undefined && outbound.Company_Key !== '') {
            if (JSONResponse.value.length > 0) {
                outbound.Terms_Key = JSONResponse.value[0].Terms_Key;
            } 
        }
        
        
        //Date: Using moment.js
        //moment('4/30/2016', 'MM/DD/YYYY').add(1, 'day')
        console.log(outbound.Date);
        
        
        //console.log('check date: ' + outbound.Date);
       

        //Due Date based on Terms
        var TermsRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_PaymentTerms(guid'" + outbound.Terms_Key + "')?$format=json", //since inside zap, the key already exists in the action_field, grabbing that with guid
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
         
        var TermsResponse = z.request(TermsRequest);
        JSONResponse = JSON.parse(TermsResponse.content);
        var terms_days = (Number(JSONResponse.Days));
        //console.log(JSONResponse);
        var dateString;
        var dateObj;
        
        if (outbound.Date === undefined){
            dateObj = moment();
            console.log('dateObj1: ' + dateObj);
        } else {
            dateString = outbound.Date;
            dateObj = new Date(dateString);
            console.log('dateObj2: ' + dateObj);
        }
            
        var momentObj = moment(dateObj);
        console.log('momentObj: ' + momentObj);
        
        /*moment.locale('en-gb');
        var outbound_date = moment(outbound.date, 'L');
        var adjusted_days = outbound_date.add("days", 1);*/
        var adjusted_days = momentObj.add(terms_days, 'days');
        console.log("adjusted_days: ", adjusted_days);
        var n1 = adjusted_days.format();
        var duedate = n1.split('.');
        outbound.DueDate = duedate[0];
        console.log('alan check Due date: ' + outbound.DueDate);


        //ShipTo BillTo
        //If user doesn't specify Address, use the default address 
        if (outbound.ShipTo_Key === undefined && outbound.Company_Key !== ''){
            var addressRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=DefaultShipping eq true and Owner_Key eq guid'" + outbound.Company_Key + "'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var addressResponse = z.request(addressRequest);
            JSONResponse = JSON.parse(addressResponse.content);
            outbound.ShipTo_Key = JSONResponse.value[0].Ref_Key;
            outbound.BillTo_Key = JSONResponse.value[0].Ref_Key;//default
        }


        //Warehouse Location
        //if location is not set, use the default
        if (outbound.LocationActual_Key === undefined && outbound.Company_Key !== '') {
            var locationRequest =  {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true', 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
              };
            var locationResponse = z.request(locationRequest);
            JSONResponse = JSON.parse(locationResponse.content);
            outbound.LocationActual_Key = JSONResponse.value[0].Ref_Key;
        }
        
        //for outbound.Location_Key === ''
        /*if (outbound.LocationActual_Key === '') {
            outbound.LocationActual_Key = '';
        }*/
       
        
        /*  //Sales Person
        var SalesPersonRequest =  {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_SalesPeople(guid'" + outbound.SalesPerson_Key + "')?$format=json", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
        };
        var SalesPersonResponse = z.request(SalesPersonRequest);
        JSONResponse = JSON.parse(SalesPersonResponse.content);
        outbound.SalesPerson_Key = JSONResponse.Ref_Key;
        if (outbound.SalesPerson_Key === undefined){
            outbound.SalesPerson_Key = "";
        }*/
        

        //Project Request
        /*if (outbound.Project_Key === undefined){
            var projectRequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Projects(guid'" + outbound.Project_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
            };
            var projectResponse = z.request(projectRequest);
            JSONResponse = JSON.parse(projectResponse.content);
            outbound.Project_Key = JSONResponse.Ref_Key;
        }
        //outbound.LineItems[0].Project_Key = outbound.Project_Key; 
        if (outbound.Project_Key === undefined){
            outbound.Project_Key = "00000000-0000-0000-0000-000000000000";
        }

        
        //Class Request
        if (outbound.Class_Key === undefined){
            var classRequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Classes(guid'" + outbound.Class_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
            };
            var classResponse = z.request(classRequest);
            JSONResponse = JSON.parse(classResponse.content);
            outbound.Class_Key = JSONResponse.Ref_Key;
        }
        if (outbound.Class_Key === undefined){
            outbound.Class_Key = "00000000-0000-0000-0000-000000000000";
        }*/

        function keyUndefined(key){
            if (key === undefined){
                key = "00000000-0000-0000-0000-000000000000";
            }    
        }
        
        if (outbound.Project_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Project_Key);
        }
        
        if (outbound.Class_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Class_Key);
        }
        
        //Shipping Carriers & Tracking#
        /*if (outbound.Carrier_Key === undefined){
            var carrierRequest = {
                'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_ShippingCarriers(guid'" + outbound.Carrier_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"
            };
            var carrierResponse = z.request(carrierRequest);
            JSONResponse = JSON.parse(carrierResponse.content);
            outbound.Carrier_Key = JSONResponse.Ref_Key;*/
        
        if (outbound.Carrier_Key === undefined){
            outbound.Carrier_Key = "00000000-0000-0000-0000-000000000000";
        }
        if (outbound.TrackingNumber === undefined){
            outbound.TrackingNumber = "";
        }
        if (outbound.URL === undefined){
            outbound.URL = "";
        }
        /*if (outbound.DeliveryDateActual === undefined){
            outbound.DeliveryDateActual = "";
        }*/


        //default parameters
        outbound.DiscountType = 'Percent'; //Discount

        //For loop for Line items total calculation
        var Doc_Subtotal = 0;
        var Doc_Discount = 0;
        var LinesTotal = 0;
        var line_subtotal = 0;
        console.log(bundle.action_fields.LineItems);
        var i;
        var j = bundle.action_fields.LineItems;
        for (i = 0; i < j.length; i++){
        
            //Product Request
            var productRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[i].Product_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };
            var productResponse = z.request(productRequest);
            JSONResponse = JSON.parse(productResponse.content);
            if (JSONResponse.value.length === 0){
                outbound.LineItems[i].Product_Key = "";
            }
            if(outbound.LineItems[i].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
        }
            else{
                //LineItems               
                outbound.LineItems[i].LineID = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) );
                outbound.LineItems[i].LineNumber = (i+1).toString();
                outbound.LineItems[i].ProductDescription = JSONResponse.value[0].Description;
                outbound.LineItems[i].Product_Key = JSONResponse.value[0].Ref_Key; //Products
                outbound.LineItems[i].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
                outbound.LineItems[i].QtyUM = outbound.LineItems[i].QtyUnits; //Quantity
                outbound.LineItems[i].LocationActual_Key = outbound.LocationActual_Key; // for LineItem's location
                outbound.LineItems[i].Location_Key = outbound.LocationActual_Key;
                outbound.LineItems[i].DeliveryDate = outbound.DeliveryDate;
                outbound.LineItems[i].DeliveryDateActual = outbound.DeliveryDateActual;
                outbound.LineItems[i].Project_Key = outbound.Project_Key;//Line Item's Projects
                outbound.LineItems[i].Class_Key = outbound.Class_Key;//Line Item's Class
                //LineTotal & LineSubtotal
                outbound.LineItems[i].LineTotal = outbound.LineItems[i].PriceUnits * outbound.LineItems[i].QtyUnits; //Total Price
                line_subtotal += outbound.LineItems[i].LineTotal; //LineTotal = LineItemTotal, in UI, it's 'Lines'
                console.log('Lines_subTotal: ' + line_subtotal);
            }
            
     
              //Unit Request - Default
            var unitRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[i].UnitSet_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };

            var unitResponse = z.request(unitRequest);
            JSONResponse = JSON.parse(unitResponse.content);
            outbound.LineItems[i].Unit_Key = JSONResponse.DefaultSaleUnit_Key;

        }
        LinesTotal = line_subtotal;
        outbound.LineSubtotal = LinesTotal.toString();
        console.log('LinesTotal: ' + LinesTotal);
        
        
        //if discount or shipping is undefined
        if (outbound.DiscountPercent === undefined){
            outbound.DiscountPercent = 0;
        }

        if (outbound.Discount === undefined){
            outbound.Discount = - (LinesTotal * (outbound.DiscountPercent / 100));
        }

        if (outbound.Shipping === undefined){
            outbound.Shipping = 0;
        }

        //Subtotal
        outbound.Discount = - (LinesTotal * (outbound.DiscountPercent / 100)); //discount for each line item
        Doc_Discount = outbound.Discount;
        outbound.SubTotal = LinesTotal + Doc_Discount; //Subtotal = after discount, before shipping
        Doc_Subtotal = outbound.SubTotal;


        //Document Total
        outbound.DocumentTotal = Doc_Subtotal + outbound.Shipping;
        outbound.DocumentTotalRC = outbound.DocumentTotal;


    //error check for Company & Product
        if (str !== ""){
           //console.log(str);
           throw new ErrorException(str);
        }
        
        //*****bundle stringify****************************
        bundle.request.data = JSON.stringify(outbound);
        console.log(bundle.request.data);
        return bundle.request;
    },




//sales order post write ********************************************************************************************************************************************
    sales_order_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        //console.log(results);
        var sales_order_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_SalesOrder(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        
        var sales_order_post_Response = z.request(sales_order_post_request);
        
    },

//account pre_write
    create_account_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        outbound.Order = outbound.Code;
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
    },

//account post_write
    
    create_account_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        if (bundle.response.status_code != 201){
            var errorMessage = results['odata.error'].message.value;
            if (errorMessage.substring(errorMessage.length-20, errorMessage.length) == '"Code" is not unique'){
                throw new ErrorException('Code is not unique.');
            }
        }
        return results;
    },
    
//sales order pre_write**************************************************************************************************************
    
    sales_order_pre_write: function(bundle) {
 
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesOrder_LineItems_RowType)"; //include this for lineItems to save it in a separate table
        
        var str = ""; //error check
        
    //Company Request
        var companyRequest =  {
            'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
          };
        var companyResponse = z.request(companyRequest);
        var JSONResponse = JSON.parse(companyResponse.content);
        //console.log('JSON_COMPANY: ' + companyResponse);
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
        }
        else {
            outbound.Company_Key = "";
        }
        
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } 
        
         //if location is not set, use the default- 'SHIP FROM' field
        if (outbound.Location_Key === undefined && outbound.Company_Key !== '') {
            var shipfromLocationRequest =  {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true', 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var shipfromLocationResponse = z.request(shipfromLocationRequest);
            JSONResponse = JSON.parse(shipfromLocationResponse.content);
            outbound.Location_Key = JSONResponse.value[0].Ref_Key;
        }
        
        function keyUndefined(key){
            if (key === undefined){
                key = "00000000-0000-0000-0000-000000000000";
            }    
        }
        
        if (outbound.Project_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Project_Key);
        }
        
        if (outbound.Class_Key === undefined && outbound.Company_Key !== ''){
            keyUndefined(outbound.Class_Key);
        }

        
        /*var projectRequest = {
            'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Projects(guid'" + outbound.Project_Key + '")?$format=json',
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        };
        var projectResponse = z.request(projectRequest);
        JSONResponse = JSON.parse(projectResponse.content);
        //outbound.LineItems[0].Project_Key = JSONResponse.value[0].Ref_Key;
        outbound.Project_Key = JSONResponse.Ref_Key; 
        if (outbound.Project_Key === undefined){
            outbound.Project_Key = "00000000-0000-0000-0000-000000000000";
        }
        
        
        //Class Request
        var classRequest = {
            'url' : "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Classes(guid'" + outbound.Class_Key + "')?$format=json",
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        };
        var classResponse = z.request(classRequest);
        JSONResponse = JSON.parse(classResponse.content);
        outbound.Class_Key = JSONResponse.Ref_Key;*/
        /*if (outbound.Class_Key === undefined){
            outbound.Class_Key = "00000000-0000-0000-0000-000000000000";
        }*/
        
        
        //always USD and exchange rate of 1
        var currencyRequest =  {
            'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_Currencies?$format=json&$filter=Description eq 'USD'", 
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "GET"
          };
        var currencyResponse = z.request(currencyRequest);
        JSONResponse = JSON.parse(currencyResponse.content);
        outbound.Currency_Key = JSONResponse.value[0].Ref_Key;
        outbound.ExchangeRate = 1;
        

        //Date
        var d = moment();
        var n = d.format();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }

        
        //If user doesn't specify Address, use the default address 
        if (outbound.ShipTo_Key === undefined && outbound.Company_Key !== ''){
            var addressRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=DefaultShipping eq true and Owner_Key eq guid'" + outbound.Company_Key + "'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
                };
            var addressResponse = z.request(addressRequest);
            JSONResponse = JSON.parse(addressResponse.content);
            //console.log(JSONResponse);
            outbound.ShipTo_Key = JSONResponse.value[0].Ref_Key;
            outbound.BillTo_Key = JSONResponse.value[0].Ref_Key;//default
        }
       
        
        //default parameters
        outbound.DiscountType = 'Percent';
        outbound.DiscountTaxability = "NonTaxable";
        outbound.DiscountTaxable = false;
       

        //total calculation
        var Doc_Subtotal = 0;
        var Doc_Discount = 0;
        var LinesTotal = 0;
        var line_subtotal = 0;
        console.log(bundle.action_fields.LineItems);
        var i;
        var j = bundle.action_fields.LineItems;
        
        for (i = 0; i < j.length; i++){
            
            ////Product Request
            var productRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[i].Product_Key + "'",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };
            var productResponse = z.request(productRequest);
            JSONResponse = JSON.parse(productResponse.content);
            
            if (JSONResponse.value.length === 0){
                outbound.LineItems[i].Product_Key = "";
            }
            
            if(outbound.LineItems[i].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
            }
            else{
                //LineItems               
                outbound.LineItems[i].LineID = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) );
                outbound.LineItems[i].LineNumber = i+1;
                outbound.LineItems[i].ProductDescription = JSONResponse.value[0].Description;
                outbound.LineItems[i].Product_Key = JSONResponse.value[0].Ref_Key; //Products
                outbound.LineItems[i].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
                outbound.LineItems[i].QtyUM = outbound.LineItems[i].QtyUnits; //Quantity
                outbound.LineItems[i].Location_Key = outbound.Location_Key; // for LineItem's location
                outbound.LineItems[i].Project_Key = outbound.Project_Key;//Line Item's Projects
                outbound.LineItems[i].Class_Key = outbound.Class_Key;//Line Item's Class
                outbound.LineItems[i].DeliveryDate = outbound.DeliveryDate; //Promise Date
                //LineTotal & LineSubtotal
                outbound.LineItems[i].LineTotal = outbound.LineItems[i].PriceUnits * outbound.LineItems[i].QtyUnits; //Total Price
                line_subtotal += outbound.LineItems[i].LineTotal; //LineTotal = LineItemTotal, in UI, it's 'Lines'
                console.log('Lines_subTotal: ' + line_subtotal);
            }
            
            
            //Lines Total
            LinesTotal = line_subtotal;
            outbound.LineSubtotal = LinesTotal.toString();
            console.log('LinesTotal: ' + LinesTotal);
            
            
            //Unit Request - Default
            var unitRequest = {
                'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[i].UnitSet_Key + "')?$format=json",
                'headers' : {
                    "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                },
                'method' : "GET"

            };

            var unitResponse = z.request(unitRequest);
            JSONResponse = JSON.parse(unitResponse.content);
            outbound.LineItems[i].Unit_Key = JSONResponse.DefaultSaleUnit_Key;
            
        }

        //if discount or shipping is undefined
        if (outbound.DiscountPercent === undefined){
            outbound.DiscountPercent = 0;
        }

        if (outbound.Discount === undefined){
            outbound.Discount = - (LinesTotal * (outbound.DiscountPercent / 100));
        }

        if (outbound.Shipping === undefined){
            outbound.Shipping = 0;
        }

        //Subtotal
        outbound.Discount = - (LinesTotal * (outbound.DiscountPercent / 100)); //discount for each line item
        Doc_Discount = outbound.Discount;
        outbound.SubTotal = LinesTotal + Doc_Discount; //Subtotal = after discount, before shipping
        Doc_Subtotal = outbound.SubTotal;


        //Document Total
        outbound.DocumentTotal = Doc_Subtotal + outbound.Shipping;
        outbound.DocumentTotalRC = outbound.DocumentTotal;


        //error check
        /*if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.  ";
        } */        
        
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }
        
        //stringify
        bundle.request.data = JSON.stringify(outbound);
        //console.log(bundle.request.data);
        return bundle.request;  
    },
    

//address_Post_Write
    create_address_post_write: function(bundle) {
        
        var results = JSON.parse(bundle.response.content);
        if (bundle.response.status_code != 201) {
        var errorMessage = results['odata.error'].message.value;
            if (errorMessage == 'Failed to save: "Address / contact"!') {
                throw new ErrorException('Address/Contact ID is not unique.');
            }
        }
        return results;
        
    },
    

//service_Post_Write
    create_service_post_write: function(bundle) {
        
        var results = JSON.parse(bundle.response.content);
        if (bundle.response.status_code != 201) {
        var errorMessage = results['odata.error'].message.value;
            if (errorMessage.substring(errorMessage.length-20,errorMessage.length) == '"Code" is not unique') {
                throw new ErrorException('Code is not unique.');
            }
        }
        return results;
        
    },

    
//Sales_Invoice_Post_Write
    sales_invoice_post_write: function(bundle) {
        var results = JSON.parse(bundle.response.content);
        var sales_invoice_post_request = {
            'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Document_SalesInvoice(guid'" + results.Ref_Key + "')/Post",
            'headers': {
              "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            }, 
            "method": "Post"
        };
        
        var sales_invoice_post_Response = z.request(sales_invoice_post_request);
    },


//product_Post_Write
    create_product_post_write: function(bundle) {
        
        var results = JSON.parse(bundle.response.content);
        if (bundle.response.status_code != 201) {
        var errorMessage = results['odata.error'].message.value;
            if (errorMessage.substring(errorMessage.length-20,errorMessage.length) == '"Code" is not unique') {
                throw new ErrorException('Code is not unique.');
            }
        }
        return results;
        
    },

//connection_Post_poll
    connection_test_post_poll: function(bundle) {
      
        if (bundle.response.status_code === 401) {
            throw new ErrorException('(401 Unauthorized) Account not found');
        }
        return JSON.parse(bundle.response.content);
        
    },

//service pre-write
    create_service_pre_write: function(bundle) {
    
        var outbound = JSON.parse(bundle.request.data);
        outbound.Type = "NonInventory";
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
    
    },

//product pre-write
    create_product_pre_write: function(bundle) {
       
        var outbound = JSON.parse(bundle.request.data);
        outbound.Type = "Inventory";
        if (outbound.CostingMethod != "FIFO") {
            outbound.CostingMethod = "WeightedAverage";
        }
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
       
    },

//company pre-write
    create_company_pre_write: function(bundle) {
    
        var outbound = JSON.parse(bundle.request.data);
        outbound.FullName = outbound.Description;
        if (!(outbound.Customer === true || outbound.Vendor === true)) {
            outbound.Customer = true;
        }
        if (outbound.Customer !== true) {
            outbound.ARAccount_Key = "00000000-0000-0000-0000-000000000000";
            outbound.IncomeAccount_Key = "00000000-0000-0000-0000-000000000000";
        }
        if (outbound.Vendor !== true) {
            outbound.APAccount_Key = "00000000-0000-0000-0000-000000000000";
            outbound.ExpenseAccount_Key = "00000000-0000-0000-0000-000000000000";
        }
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
        
    }

};