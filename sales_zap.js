
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

var Zap = {

    //Sales_Invoice_Pre_Write
    sales_invoice_pre_write: function(bundle) {
    
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesInvoice_LineItems_RowType)";
        //console.log('TermsKey' + outbound.Terms_Key);
        
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
            outbound.Company_Key = "";
        }
        
        
        //If sales order Number is not set- optional
        /*if (outbound.Number === undefined){
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
            outbound.Number = (JSONResponse.value[0].Number) + 1;
        } */
        
        
        //Using moment.js
        //moment('4/30/2016', 'MM/DD/YYYY').add(1, 'day')
        var d = moment();
        console.log('moment: ', d);
        var n = d.format();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        } 
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
        
        if (outbound.Terms_Key === undefined) {
            var termsNet30_Request =  {
                'url': "https://apps7.accountingsuite.com/a/" + bundle.auth_fields.tenant_id + 
                    //"/odata/standard.odata/Catalog_PaymentTerms(guid'e4ab5cdd-8b42-11e6-80d8-0cc47ac0d6e3')?$format=json", //&$filter=Description eq 'Net 30'
                    "/odata/standard.odata/Catalog_PaymentTerms?$format=json&$filter=Description eq " + 'Net 30',
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
            };
            var termsNet30_Response = z.request(termsNet30_Request);
            JSONResponse = JSON.parse(termsNet30_Response.content);
            outbound.Terms_Key = JSONResponse.Ref_Key;  
        }else{
            var TermsResponse = z.request(TermsRequest);
            JSONResponse = JSON.parse(TermsResponse.content);
            //console.log(JSONResponse);
        }
        
        var terms_days = (Number(JSONResponse.Days));
        var adjusted_days = moment().add(terms_days, 'day');
        var n1 = adjusted_days.format();
        var duedate = n1.split('.');
        outbound.DueDate = duedate[0];
        console.log('alan check Due date: ' + outbound.DueDate);
        
        //moment('4/30/2016', 'MM/DD/YYYY').add(1, 'day')
        /*var adjusted_time = d2.getTime() + terms_Days*24*60*60*1000; //in ms
        console.log("adjusted time: " + adjusted_time);
        var d3 = new Date(adjusted_time);
        console.log('adjusted date: '+ d3);
        var n1 = d3.toISOString();
        console.log('adjusted date string: '+ n1);
        var duedate = n1.split('.');
        console.log('duedate: '+ duedate);
        outbound.DueDate = duedate[0]; */
           

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
            outbound.ShipTo_Key = JSONResponse.value[0].Ref_Key;
            outbound.BillTo_Key = JSONResponse.value[0].Ref_Key;//default
        }


        //Warehouse Location
        //if location is not set, use the default
        if (outbound.Location_Key === undefined) {
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
        //outbound.LineItems[0].Project_Key = outbound.Project_Key; 
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
        outbound.Class_Key = JSONResponse.Ref_Key;
        if (outbound.Class_Key === undefined){
            outbound.Class_Key = "00000000-0000-0000-0000-000000000000";
        }

        
        //Shipping Carriers & Tracking#
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
        outbound.Carrier_Key = JSONResponse.Ref_Key;
        
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
        
        for (var i = 0, j = bundle.action_fields.LineItems.length; i < j; i++){
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
            else{
                //LineItems               
                outbound.LineItems[i].LineID = (randomStringGen(8) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(4) + "-" + randomStringGen(12) );
                outbound.LineItems[i].LineNumber = (i+1).toString();
                outbound.LineItems[i].ProductDescription = JSONResponse.value[0].Description;
                outbound.LineItems[i].Product_Key = JSONResponse.value[0].Ref_Key; //Products
                outbound.LineItems[i].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
                outbound.LineItems[i].QtyUM = outbound.LineItems[i].QtyUnits; //Quantity
                outbound.LineItems[i].LocationActual_Key = outbound.Location_Key; // for LineItem's location
                outbound.LineItems[i].DeliveryDate = outbound.DeliveryDate;
                outbound.LineItems[i].DeliveryDateActual = outbound.DeliveryDateActual;
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
        var str = "";
        if (outbound.Company_Key === ""){
            str += "The customer you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new customer.";
        } 
        
        if(outbound.LineItems[0].Product_Key === ""){
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
        }
        
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
        /*var companyResponse = z.request(companyRequest,function(err, response){
            var JSONResponse = JSON.parse(companyResponse.content);
            //console.log('JSON_COMPANY: ' + companyResponse);
            if (JSONResponse.value.length > 0) {
                outbound.Company_Key = JSONResponse.value[0].Ref_Key;
            }
            else {
                outbound.Company_Key = "";
            }
        });*/
        
        var JSONResponse = JSON.parse(companyResponse.content);
        //console.log('JSON_COMPANY: ' + companyResponse);
        if (JSONResponse.value.length > 0) {
            outbound.Company_Key = JSONResponse.value[0].Ref_Key;
        }
        else {
            outbound.Company_Key = "";
        }

        
         //if location is not set, use the default- 'SHIP FROM' field
        if (outbound.Location_Key === undefined){
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
        
        if (outbound.Project_Key === undefined){
            keyUndefined(outbound.Project_Key);
        }
        
        if (outbound.Class_Key === undefined){
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
       

        //total calculation
        var Doc_Subtotal = 0;
        var Doc_Discount = 0;
        var LinesTotal = 0;
        var line_subtotal = 0;
        console.log(bundle.action_fields.LineItems);

        for (var i = 0, j = bundle.action_fields.LineItems.length; i < j; i++){
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