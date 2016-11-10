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

var LineId_Key = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) ); //creates random (8-4-4-4-12 digit) LineID String
//console.log(LineId_Key);

var Zap = {

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


    //Sales_Invoice_Pre_Write
    sales_invoice_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        console.log('TermsKey' + outbound.Terms_Key);
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
        }
        else {
            // create a new company
            //console.log("found no company");
            outbound.Company_Key = "";
        }
        
       
        //console.log(outbound.Company_Key);
        
    
        /*Date.prototype.dst = function() {
            return this.getTimezoneOffset() < this.stdTimezoneOffset();
        }*/
        var d = new Date();
        var d1 = new Date();
        var d2 = new Date(d1);
        d2.setHours(d1.getHours() - d1.getTimezoneOffset()/60);
        
    
        var n = d2.toISOString();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }
        
        /*var is_DST = function (t) { //t is the date object to check, returns true if daylight saving time is in effect.
            var jan = new Date(t.getFullYear(),0,1);
            var jul = new Date(t.getFullYear(),6,1);
            return Math.max(jan.getTimezoneOffset(),jul.getTimezoneOffset()) == t.getTimezoneOffset();  
        }; //Day Light Saving
        var new_curr_time;
        if (is_DST(d)){
            var curr_time = d.getTime(); // in ms
            var UTC_offset = new Date().getTimezoneOffset(); //in minutes
            UTC_offset = (UTC_offset)*60*1000; //in ms
            new_curr_time = curr_time - UTC_offset; //in ms
            
        } else{
            new_curr_time = d.getTime();
        }
        
        var date = new Date(new_curr_time);*/
        //var date = d;
        //var curr_time = d.getTime(); // in ms
        //var n = new Date(curr_time).toISOString();
        //date = n.split('.');
        //outbound.Date = date[0];
        /*if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }
        console.log(outbound.Date);*/
        
        
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
        console.log(JSONResponse);
        
        /*var terms_Days = (Number(JSONResponse.Days));
        terms_Days = terms_Days*24*60*60*1000; //in ms
        
        //console.log('UTC: ' + UTC_offset_ms);
        //console.log('curr_time: '+ curr_time);
        
        //var adjusted_time = curr_time + terms_Days;
        var adjusted_time = d.getTime() + terms_Days;
        var DueDate = new Date(adjusted_time);
        
        n = DueDate.toISOString();
        DueDate = n.split('.');
        outbound.DueDate = DueDate[0];*/

        /*if (outbound.DueDate === undefined) {
            outbound.DueDate = DueDate[0];
        }*/
        
        /*if (outbound.Terms_Key === undefined){
            outbound.Terms_Key = JSONResponse.Ref_Key; //"e4ab5cdd-8b42-11e6-80d8-0cc47ac0d6e3"; //default- Net30
        }
        console.log(outbound.DueDate);*/
        
        
     //ShipTo BillTo
     //If user doesn't specify Address, use the default address 
        if (outbound.ShipTo_Key === undefined){
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
        
       //Sales Person
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
        
        
        
        
        
    
    //error check for Company & Product
        /*var str = "";
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } */
        
        /*if(outbound.LineItems[0].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
        }*/
        
        /*if (str !== ""){
           //console.log(str);
           throw new ErrorException(str);
        }*/
        //bundle stringify
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
    },


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
    
//sales order pre_write
    sales_order_pre_write: function(bundle) {
        
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesOrder_LineItems_RowType)"; //include this for lineItems to save it in a separate table
        
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
        //console.log(JSONResponse);
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
        }
        else {
            // create a new company
            //console.log("found no company");
            outbound.Company_Key = "";
        }
        //console.log(outbound.Company_Key);
        
    // Projects Request
        var projectRequest = {
            'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Projects?$format=json',
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        };
        var projectResponse = z.request(projectRequest);
        JSONResponse = JSON.parse(projectResponse.content);
        outbound.LineItems[0].Project_Key = JSONResponse.value[0].Ref_Key;
        outbound.Project_Key = outbound.LineItems[0].Project_Key; 
        
    //Product Request
        var productRequest = {
            'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[0].Product_Key + "'",
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        
        };
        //console.log(productRequest);
        var productResponse = z.request(productRequest);
        JSONResponse = JSON.parse(productResponse.content);
        //console.log(JSONResponse);
        if (JSONResponse.value.length === 0){
            outbound.LineItems[0].Product_Key = "";
        }
        else{
            //LineItems
            outbound.LineItems[0].LineID = LineId_Key;
            outbound.LineItems[0].LineNumber = "1";
            outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
            outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key; //Products
            outbound.LineItems[0].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
            outbound.LineItems[0].QtyUM = outbound.LineItems[0].QtyUnits; //Quantity
            outbound.LineItems[0].LineTotal = outbound.LineItems[0].PriceUnits * outbound.LineItems[0].QtyUnits; //Total Price
            outbound.LineSubtotal = outbound.LineItems[0].LineTotal; //LineTotal = LineItemTotal
        }
        
        var str = "";
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.  ";
        } 
        
        if(outbound.LineItems[0].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
        }
        
        if (str !== ""){
           console.log(str);
           throw new ErrorException(str);
        }
    //Unit Request - Default
        var unitRequest = {
            'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[0].UnitSet_Key + "')?$format=json",
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        
        };
        
        var unitResponse = z.request(unitRequest);
        //console.log(unitResponse);
        JSONResponse = JSON.parse(unitResponse.content);
        outbound.LineItems[0].Unit_Key = JSONResponse.DefaultSaleUnit_Key;
        
        
    //if order number is not set, use the next number in ACS
        //console.log(outbound.Number);
        /*if (outbound.Number === undefined) {
            var numberRequest =  {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_DocumentNumbering?$format=json&$filter=Description eq 'Sales order'", 
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
              };
            var numberResponse = z.request(numberRequest);
            JSONResponse = JSON.parse(numberResponse.content);
            outbound.Number = (JSONResponse.value[0].Number) + 1; //auto-generates sales number, updated- 10.26.2016
            
        }*/
  
    //if location is not set, use the default
        if (outbound.Location_Key === undefined) {
            //console.log(outbound.Location_Key);
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
            outbound.Location_Key = JSONResponse.value[0].Ref_Key;
        }
        outbound.LineItems[0].Location_Key = outbound.Location_Key; // for LineItem's location
        
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
        var d = new Date();
        var n = d.toISOString();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }
        
    //If user doesn't specify Address, use the default address 
        if (outbound.ShipTo_Key === undefined){
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
        if (outbound.DiscountPercent === undefined){
            outbound.DiscountPercent = 0;
        }
        outbound.Discount = - (outbound.LineItems[0].LineTotal * (outbound.DiscountPercent / 100));
        outbound.SubTotal = (outbound.LineItems[0].LineTotal) + outbound.Discount; //Subtotal = after discount, before shipping
        if (outbound.Shipping === undefined){
            outbound.Shipping = 0;
        }
        
        outbound.DocumentTotal = (outbound.LineItems[0].LineTotal) + (outbound.Discount) + outbound.Shipping;
        //console.log(outbound.DocumentTotal);
        outbound.DocumentTotalRC = outbound.DocumentTotal;
        console.log(outbound.DocumentTotalRC);
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

    connection_test_post_poll: function(bundle) {
      
        if (bundle.response.status_code === 401) {
            throw new ErrorException('(401 Unauthorized) Account not found');
        }
        return JSON.parse(bundle.response.content);
        
    },

    create_service_pre_write: function(bundle) {
    
        var outbound = JSON.parse(bundle.request.data);
        outbound.Type = "NonInventory";
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
    
    },

    create_product_pre_write: function(bundle) {
       
        var outbound = JSON.parse(bundle.request.data);
        outbound.Type = "Inventory";
        if (outbound.CostingMethod != "FIFO") {
            outbound.CostingMethod = "WeightedAverage";
        }
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
       
    },

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


// 'use strict';

// function randomStringGen(len, charSet){
//     charSet = charSet || 'abcdef0123456789';
//     var randomString = '';
//     for (var i = 0; i < len; i++) {
//       var randomPoz = Math.floor(Math.random() * charSet.length);
//       randomString += charSet.substring(randomPoz,randomPoz+1);
//     }
//     return randomString;
// }

// var LineId_Key = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) ); //creates random (8-4-4-4-12 digit) LineID String
// //console.log(LineId_Key);

// var Zap = {

//     //Sales_Invoice_Post_Write
//     sales_invoice_post_write: function(bundle) {
//         var results = JSON.parse(bundle.response.content);
//         var sales_invoice_post_request = {
//             'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
//                 "/odata/standard.odata/Document_SalesInvoice(guid'" + results.Ref_Key + "')/Post",
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "Post"
//         };
        
//         var sales_invoice_post_Response = z.request(sales_invoice_post_request);
//     },


//     //Sales_Invoice_Pre_Write
//     sales_invoice_pre_write: function(bundle) {
//         var outbound = JSON.parse(bundle.request.data);
//         console.log('TermsKey' + outbound.Terms_Key);
//         var companyRequest =  {
//             'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'",
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "GET"
//         };
//         var companyResponse = z.request(companyRequest);
//         var JSONResponse = JSON.parse(companyResponse.content);
       
//         if (JSONResponse.value.length > 0) {
//             outbound.Company_Key = JSONResponse.value[0].Ref_Key;
//         }
//         else {
//             // create a new company
//             //console.log("found no company");
//             outbound.Company_Key = "";
//         }
        
       
//         //console.log(outbound.Company_Key);
        
//     //Invoice_Date
//         var d = new Date();
//         var n = d.toISOString();
//         var date = n.split('.');
//         if (outbound.Date === undefined) {
//             outbound.Date = date[0];
//         }
//         console.log(outbound.Date);
//      //Due Date based on Terms
//         var TermsRequest =  {
//             'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
//                 "/odata/standard.odata/Catalog_PaymentTerms(guid'" + outbound.Terms_Key + "')?$format=json", //since inside zap, the key already exists in the action_field, grabbing that with guid
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "GET"
//         };
//         var TermsResponse = z.request(TermsRequest);
//         JSONResponse = JSON.parse(TermsResponse.content);
//         console.log(JSONResponse);
        
//         var terms_Days = (Number(JSONResponse.Days));
//         var terms_Days_ms = terms_Days*24*60*60*1000;
//         var curr_time = d.getTime(); // in ms
//         var UTC_offset = new Date().getTimezoneOffset(); //in minutes
//         var UTC_offset_ms = (UTC_offset)*60*1000;
//         console.log('UTC: ' + UTC_offset_ms);
//         console.log('curr_time: '+ curr_time);
//         var adjusted_time = curr_time - UTC_offset_ms + terms_Days_ms;
//         var DueDate = new Date(adjusted_time);
        
//         n = DueDate.toISOString();
//         DueDate = n.split('.');
//         if (outbound.DueDate === undefined) {
//             outbound.DueDate = DueDate[0];
//         }
//         console.log(outbound.DueDate);
        

//     //error check for Company & Product
//         /*var str = "";
//         if (outbound.Company_Key === ""){
//             str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
//         } */
        
//         /*if(outbound.LineItems[0].Product_Key === ""){
//             str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
//         }*/
        
//         /*if (str !== ""){
//            //console.log(str);
//            throw new ErrorException(str);
//         }*/
//         //bundle stringify
//         bundle.request.data = JSON.stringify(outbound);
//         return bundle.request;
//     },


//     sales_order_post_write: function(bundle) {
//         var results = JSON.parse(bundle.response.content);
//         //console.log(results);
//         var sales_order_post_request = {
//             'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
//                 "/odata/standard.odata/Document_SalesOrder(guid'" + results.Ref_Key + "')/Post",
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "Post"
//         };
        
//         var sales_order_post_Response = z.request(sales_order_post_request);
        
//     },

// //account pre_write
//     create_account_pre_write: function(bundle) {
//         var outbound = JSON.parse(bundle.request.data);
//         outbound.Order = outbound.Code;
//         bundle.request.data = JSON.stringify(outbound);
//         return bundle.request;
//     },
    
//     create_account_post_write: function(bundle) {
//         var results = JSON.parse(bundle.response.content);
//         if (bundle.response.status_code != 201){
//             var errorMessage = results['odata.error'].message.value;
//             if (errorMessage.substring(errorMessage.length-20, errorMessage.length) == '"Code" is not unique'){
//                 throw new ErrorException('Code is not unique.');
//             }
//         }
//         return results;
//     },
    
// //sales order pre_write
//     sales_order_pre_write: function(bundle) {
        
//         var outbound = JSON.parse(bundle.request.data);
//         outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesOrder_LineItems_RowType)"; //include this for lineItems to save it in a separate table
        
//     //Company Request
//         var companyRequest =  {
//             'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Companies?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.Company_Key + "'", 
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "GET"
//           };
//         var companyResponse = z.request(companyRequest);
//         var JSONResponse = JSON.parse(companyResponse.content);
//         //console.log(JSONResponse);
//         if (JSONResponse.value.length > 0) {
//             outbound.Company_Key = JSONResponse.value[0].Ref_Key;
//         }
//         else {
//             // create a new company
//             //console.log("found no company");
//             outbound.Company_Key = "";
//         }
//         //console.log(outbound.Company_Key);
        
//     // Projects Request
//         var projectRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Projects?$format=json',
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
//         };
//         var projectResponse = z.request(projectRequest);
//         JSONResponse = JSON.parse(projectResponse.content);
//         outbound.LineItems[0].Project_Key = JSONResponse.value[0].Ref_Key;
//         outbound.Project_Key = outbound.LineItems[0].Project_Key; 
        
//     //Product Request
//         var productRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[0].Product_Key + "'",
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
        
//         };
//         //console.log(productRequest);
//         var productResponse = z.request(productRequest);
//         JSONResponse = JSON.parse(productResponse.content);
//         //console.log(JSONResponse);
//         if (JSONResponse.value.length === 0){
//             outbound.LineItems[0].Product_Key = "";
//         }
//         else{
//             //LineItems
//             outbound.LineItems[0].LineID = LineId_Key;
//             outbound.LineItems[0].LineNumber = "1";
//             outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
//             outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key; //Products
//             outbound.LineItems[0].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
//             outbound.LineItems[0].QtyUM = outbound.LineItems[0].QtyUnits; //Quantity
//             outbound.LineItems[0].LineTotal = outbound.LineItems[0].PriceUnits * outbound.LineItems[0].QtyUnits; //Total Price
//             outbound.LineSubtotal = outbound.LineItems[0].LineTotal; //LineTotal = LineItemTotal
//         }
        
//         var str = "";
//         if (outbound.Company_Key === ""){
//             str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.  ";
//         } 
        
//         if(outbound.LineItems[0].Product_Key === ""){
//             str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
//         }
        
//         if (str !== ""){
//            console.log(str);
//            throw new ErrorException(str);
//         }
//     //Unit Request - Default
//         var unitRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 "/odata/standard.odata/Catalog_UnitSets(guid'" + outbound.LineItems[0].UnitSet_Key + "')?$format=json",
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
        
//         };
        
//         var unitResponse = z.request(unitRequest);
//         //console.log(unitResponse);
//         JSONResponse = JSON.parse(unitResponse.content);
//         outbound.LineItems[0].Unit_Key = JSONResponse.DefaultSaleUnit_Key;
        
        
//     //if order number is not set, use the next number in ACS
//         //console.log(outbound.Number);
//         /*if (outbound.Number === undefined) {
//             var numberRequest =  {
//                 'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                     "/odata/standard.odata/Catalog_DocumentNumbering?$format=json&$filter=Description eq 'Sales order'", 
//                 'headers': {
//                   "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//                 }, 
//                 "method": "GET"
//               };
//             var numberResponse = z.request(numberRequest);
//             JSONResponse = JSON.parse(numberResponse.content);
//             outbound.Number = (JSONResponse.value[0].Number) + 1; //auto-generates sales number, updated- 10.26.2016
            
//         }*/
  
//     //if location is not set, use the default
//         if (outbound.Location_Key === undefined) {
//             //console.log(outbound.Location_Key);
//             var locationRequest =  {
//                 'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                     '/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true', 
//                 'headers': {
//                   "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//                 }, 
//                 "method": "GET"
//               };
//             var locationResponse = z.request(locationRequest);
//             JSONResponse = JSON.parse(locationResponse.content);
//             outbound.Location_Key = JSONResponse.value[0].Ref_Key;
//         }
//         outbound.LineItems[0].Location_Key = outbound.Location_Key; // for LineItem's location
        
//     //always USD and exchange rate of 1
//         var currencyRequest =  {
//             'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 "/odata/standard.odata/Catalog_Currencies?$format=json&$filter=Description eq 'USD'", 
//             'headers': {
//               "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             }, 
//             "method": "GET"
//           };
//         var currencyResponse = z.request(currencyRequest);
//         JSONResponse = JSON.parse(currencyResponse.content);
//         outbound.Currency_Key = JSONResponse.value[0].Ref_Key;
//         outbound.ExchangeRate = 1;
        
//     //Date
//         var d = new Date();
//         var n = d.toISOString();
//         var date = n.split('.');
//         if (outbound.Date === undefined) {
//             outbound.Date = date[0];
//         }
        
//     //If user doesn't specify Address, use the default address 
//         if (outbound.ShipTo_Key === undefined){
//             var addressRequest = {
//                 'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                     "/odata/standard.odata/Catalog_Addresses?$format=json&$filter=DefaultShipping eq true and Owner_Key eq guid'" + outbound.Company_Key + "'",
//                 'headers': {
//                   "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//                 }, 
//                 "method": "GET"
//                 };
//             var addressResponse = z.request(addressRequest);
//             JSONResponse = JSON.parse(addressResponse.content);
//             //console.log(JSONResponse);
//             outbound.ShipTo_Key = JSONResponse.value[0].Ref_Key;
//             outbound.BillTo_Key = JSONResponse.value[0].Ref_Key;//default
//         }
       
        
//     //default parameters
//         outbound.DiscountType = 'Percent';
//         outbound.DiscountTaxability = "NonTaxable";
//         outbound.DiscountTaxable = false;
//         if (outbound.DiscountPercent === undefined){
//             outbound.DiscountPercent = 0;
//         }
//         outbound.Discount = - (outbound.LineItems[0].LineTotal * (outbound.DiscountPercent / 100));
//         outbound.SubTotal = (outbound.LineItems[0].LineTotal) + outbound.Discount; //Subtotal = after discount, before shipping
//         if (outbound.Shipping === undefined){
//             outbound.Shipping = 0;
//         }
        
//         outbound.DocumentTotal = (outbound.LineItems[0].LineTotal) + (outbound.Discount) + outbound.Shipping;
//         //console.log(outbound.DocumentTotal);
//         outbound.DocumentTotalRC = outbound.DocumentTotal;
//         console.log(outbound.DocumentTotalRC);
//         bundle.request.data = JSON.stringify(outbound);
//         //console.log(bundle.request.data);
//         return bundle.request;  
//     },
    

// //address_Post_Write
//     create_address_post_write: function(bundle) {
        
//         var results = JSON.parse(bundle.response.content);
//         if (bundle.response.status_code != 201) {
//         var errorMessage = results['odata.error'].message.value;
//             if (errorMessage == 'Failed to save: "Address / contact"!') {
//                 throw new ErrorException('Address/Contact ID is not unique.');
//             }
//         }
//         return results;
        
//     },
    
//     create_service_post_write: function(bundle) {
        
//         var results = JSON.parse(bundle.response.content);
//         if (bundle.response.status_code != 201) {
//         var errorMessage = results['odata.error'].message.value;
//             if (errorMessage.substring(errorMessage.length-20,errorMessage.length) == '"Code" is not unique') {
//                 throw new ErrorException('Code is not unique.');
//             }
//         }
//         return results;
        
//     },

//     create_product_post_write: function(bundle) {
        
//         var results = JSON.parse(bundle.response.content);
//         if (bundle.response.status_code != 201) {
//         var errorMessage = results['odata.error'].message.value;
//             if (errorMessage.substring(errorMessage.length-20,errorMessage.length) == '"Code" is not unique') {
//                 throw new ErrorException('Code is not unique.');
//             }
//         }
//         return results;
        
//     },

//     connection_test_post_poll: function(bundle) {
      
//         if (bundle.response.status_code === 401) {
//             throw new ErrorException('(401 Unauthorized) Account not found');
//         }
//         return JSON.parse(bundle.response.content);
        
//     },

//     create_service_pre_write: function(bundle) {
    
//         var outbound = JSON.parse(bundle.request.data);
//         outbound.Type = "NonInventory";
//         bundle.request.data = JSON.stringify(outbound);
//         return bundle.request;
    
//     },

//     create_product_pre_write: function(bundle) {
       
//         var outbound = JSON.parse(bundle.request.data);
//         outbound.Type = "Inventory";
//         if (outbound.CostingMethod != "FIFO") {
//             outbound.CostingMethod = "WeightedAverage";
//         }
//         bundle.request.data = JSON.stringify(outbound);
//         return bundle.request;
       
//     },

//     create_company_pre_write: function(bundle) {
    
//         var outbound = JSON.parse(bundle.request.data);
//         outbound.FullName = outbound.Description;
//         if (!(outbound.Customer === true || outbound.Vendor === true)) {
//             outbound.Customer = true;
//         }
//         if (outbound.Customer !== true) {
//             outbound.ARAccount_Key = "00000000-0000-0000-0000-000000000000";
//             outbound.IncomeAccount_Key = "00000000-0000-0000-0000-000000000000";
//         }
//         if (outbound.Vendor !== true) {
//             outbound.APAccount_Key = "00000000-0000-0000-0000-000000000000";
//             outbound.ExpenseAccount_Key = "00000000-0000-0000-0000-000000000000";
//         }
//         bundle.request.data = JSON.stringify(outbound);
//         return bundle.request;
        
//     }

// };