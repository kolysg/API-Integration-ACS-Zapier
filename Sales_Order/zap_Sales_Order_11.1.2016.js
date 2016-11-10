//11.3.2016

'use strict';

var Zap = {
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
        outbound.LineItems[0].LineNumber = "1";
        outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
        outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key;
        outbound.LineItems[0].UnitSet_Key = JSONResponse.value[0].UnitSet_Key;
        outbound.LineItems[0].QtyUM = outbound.LineItems[0].QtyUnits; //Quantity
        outbound.LineItems[0].LineTotal = outbound.LineItems[0].PriceUnits * outbound.LineItems[0].QtyUnits; //Total Price
        
//Unit Request
        var unitRequest = {
            'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_UnitSets(guid"outbound.LineItems[0].UnitSet_Key")?$format=json',
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        
        };
        
        var unitResponse = z.request(unitRequest);
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
        
//User inputs Address_ Work_in_Progress
        /*else {
        //following this format: Street Address/ City/State/Zip
            var Address_Arr = outbound.ShipTo_Key.split(',');
            console.log(Address_Arr);
            var i;
            for (i = 0; i < Address_Arr.length; i++){
                var State_Zip = Address_Arr[Address_Arr.length - 1].split(' ');
                var Zip = State_Zip[1];
                var State = State_Zip[0];
                console.log(State_Zip);
            }
            //var re = new RegExp(/^\d+\w*\s*(?:[\-\/]?\s*)?\d*\s*\d+\/?\s*\d*\s*/);
            //console.log(outbound.ShipTo_Key).match(re);
            //outbound.ShipTo_Key = outbound.ShipTo_Key.split(',');
            //console.log(outbound.ShipTo_Key);
            //outbound.AddressLine1 = outbound.ShipTo_Key[0];
            //var AddressLine1 = outbound.ShipTo_Key[0];
            //console.log(outbound.AddressLine1);
            /*var City =  outbound.ShipTo_Key[1];
            var State_Zip =  outbound.ShipTo_Key[2].split(' ');
            var State =  State_Zip[0];
            var Zip = State_Zip[1];
            if (outbound.ShipTo_Key.length > 4) {
                var country = outbound.ShipTo_Key[4];
            }*/
            //regular expression to find street number var re = /^\d+\w*\s*(?:[\-\/]?\s*)?\d*\s*\d+\/?\s*\d*\s*/; 
            //(ref:http://www.htmlgoodies.com/beyond/javascript/parsing-building-and-street-fields-from-an-address-using-regular-expressions.html)
        }*/
        
        
//default parameters
        outbound.DiscountType = 'Percent';
        outbound.DiscountTaxability = "NonTaxable";
        outbound.DiscountTaxable = false;
        outbound.Discount = - (outbound.LineItems[0].LineTotal * (outbound.DiscountPercent / 100));
        if (outbound.Shipping === undefined){
            outbound.Shipping = 0;
        }
        outbound.DocumentTotal = (outbound.LineItems[0].LineTotal) + (outbound.Discount) + outbound.Shipping;
        //console.log(outbound.DocumentTotal);
        outbound.DocumentTotalRC = outbound.DocumentTotal;
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




// //11.2.2016
// 'use strict';

// var Zap = {
//      //account pre_write
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
        
// //Company Request
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
//             console.log("found no company");
//             outbound.Company_Key = "";
//         }
//         console.log(outbound.Company_Key);
        
// //Product Request
//         var productRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[0].Product_Key + "'",
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
        
//         };
//         console.log(productRequest);
//         var productResponse = z.request(productRequest);
//         JSONResponse = JSON.parse(productResponse.content);
//         console.log(JSONResponse);
//         outbound.LineItems[0].LineNumber = "1";
//         outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
//         outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key;
//         outbound.LineItems[0].QtyUM = outbound.LineItems[0].QtyUnits; //Quantity
//         outbound.LineItems[0].LineTotal = outbound.LineItems[0].PriceUnits * outbound.LineItems[0].QtyUnits; //Total Price
        
// //Unit Request
//         var unitRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Units?$format=json',
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
        
//         };
        
//         var unitResponse = z.request(unitRequest);
//         JSONResponse = JSON.parse(unitResponse.content);
//         outbound.LineItems[0].Unit_Key = JSONResponse.value[0].Ref_Key;
//         //outbound.LineItems[0]. = JSONResponse.value[0].Description;
        
// //if order number is not set, use the next number in ACS
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
  
// //if location is not set, use the default
//         if (outbound.Location_Key === undefined) {
//             console.log(outbound.Location_Key);
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
        
// //always USD and exchange rate of 1
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
        
        
// //Date
//         var d = new Date();
//         var n = d.toISOString();
//         var date = n.split('.');
//         if (outbound.Date === undefined) {
//             outbound.Date = date[0];
//         }
        
        
// //default parameters
//         outbound.DiscountType = 'Percent';
//         outbound.DiscountTaxability = "NonTaxable";
//         outbound.DiscountTaxable = false;
        
        
        
//         bundle.request.data = JSON.stringify(outbound);
//         console.log(bundle.request.data);
//         return bundle.request;
        
//     },
    
//     //address_Post_Write
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



//11.1.2016
// 'use strict';

// var Zap = {
//      //account pre_write
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
        
// //Company Request
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
//             console.log("found no company");
//             outbound.Company_Key = "";
//         }
//         console.log(outbound.Company_Key);
        
// //Product Request
//         var productRequest = {
//             'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
//                 '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[0].Product_Key + "'",
//             'headers' : {
//                 "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
//             },
//             'method' : "GET"
        
//         };
//         console.log(productRequest);
//         var productResponse = z.request(productRequest);
//         JSONResponse = JSON.parse(productResponse.content);
//         console.log(JSONResponse);
//         outbound.LineItems[0].LineNumber = "1";
//         outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
//         outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key;
        
        
// //if order number is not set, use the next number in ACS
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
  
// //if location is not set, use the default
//         if (outbound.Location_Key === undefined) {
//             console.log(outbound.Location_Key);
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
        
// //always USD and exchange rate of 1
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
        
        
// //Date
//         var d = new Date();
//         var n = d.toISOString();
//         var date = n.split('.');
//         if (outbound.Date === undefined) {
//             outbound.Date = date[0];
//         }
        
        
// //default parameters
//         outbound.DiscountType = 'Percent';
//         outbound.DiscountTaxability = "NonTaxable";
//         outbound.DiscountTaxable = false;
        
        
        
//         bundle.request.data = JSON.stringify(outbound);
//         console.log(bundle.request.data);
//         return bundle.request;
        
//     },
    
//     //address_Post_Write
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

//10/31/2016

// 'use strict';

// var Zap = {
//      //account pre_write
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
    
//     //sales order pre_write
//     sales_order_pre_write: function(bundle) {
    
//         var outbound = JSON.parse(bundle.request.data);
        
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
//         console.log(JSONResponse);
//         if (JSONResponse.value.length > 0) {
//             outbound.Company_Key = JSONResponse.value[0].Ref_Key;
//         }
//         else {
//             // create a new company
//             console.log("found no company");
//             outbound.Company_Key = "";
//         }
        
//         //if order number is not set, use the next number in ACS
        
//         if (outbound.Number == "undefined") {
//             console.log(outbound.Number);
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
            
//         }
  
//         //if location is not set, use the default
//         if (outbound.Location_Key == "undefined") {
//             console.log('location');
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
        
//         //always USD and exchange rate of 1
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
         
//         outbound.DiscountType = 'Percent';
//         console.log(bundle.request.data);
//         return bundle.request;
        
//     },
    
//     //address_Post_Write
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