//Sales_Invoice_Pre_Write
    sales_invoice_pre_write: function(bundle) {
        var outbound = JSON.parse(bundle.request.data);
        outbound['LineItems@odata.type'] = "Collection(StandardODATA.Document_SalesInvoice_LineItems_RowType)";
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
        
    //Date_default
        var d = new Date();
        var d2 = new Date(d);
        console.log(d2);
        console.log(d.getHours());
        console.log(d.getTimezoneOffset()/60);
        d2.setHours(d.getHours() - d.getTimezoneOffset()/60);
        console.log(d2);
        var n = d2.toISOString();
        var date = n.split('.');
        if (outbound.Date === undefined) {
            outbound.Date = date[0];
        }
        console.log('alan check date: ' + outbound.Date);
       
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
                    "/odata/standard.odata/Catalog_PaymentTerms(guid'e4ab5cdd-8b42-11e6-80d8-0cc47ac0d6e3')?$format=json", 
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
        
        var terms_Days = (Number(JSONResponse.Days));
        //terms_Days = terms_Days*24*60*60*1000; //in ms
        var adjusted_time = d2.getTime() + terms_Days*24*60*60*1000; //in ms
        console.log("adjusted time: " + adjusted_time);
        var d3 = new Date(adjusted_time);
        console.log('adjusted date: '+ d3);
        var n1 = d3.toISOString();
        console.log('adjusted date string: '+ n1);
        var duedate = n1.split('.');
        console.log('duedate: '+ duedate);
        outbound.DueDate = duedate[0]; 
           
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
        
        
        //Product Request
        var productRequest = {
            'url' : 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                '/odata/standard.odata/Catalog_Products?$format=json&$filter=Description eq ' + "'" + bundle.action_fields.LineItems[0].Product_Key + "'",
            'headers' : {
                "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
            },
            'method' : "GET"
        
        };
        //console.log("product Request: " + productRequest);
        var productResponse = z.request(productRequest);
        JSONResponse = JSON.parse(productResponse.content);
        console.log("Product JSON: " + productResponse);
        if (JSONResponse.value.length === 0){
            outbound.LineItems[0].Product_Key = "";
        }
        else{
            //LineItems
            //outbound.LineItems[0].LineID = LineId_Key;
            outbound.LineItems[0].LineNumber = "1";
            outbound.LineItems[0].ProductDescription = JSONResponse.value[0].Description;
            outbound.LineItems[0].Product_Key = JSONResponse.value[0].Ref_Key; //Products
            outbound.LineItems[0].UnitSet_Key = JSONResponse.value[0].UnitSet_Key; //Unit
            outbound.LineItems[0].QtyUM = outbound.LineItems[0].QtyUnits; //Quantity
            outbound.LineItems[0].LineTotal = outbound.LineItems[0].PriceUnits * outbound.LineItems[0].QtyUnits; //Total Price
            outbound.LineSubtotal = outbound.LineItems[0].LineTotal; //LineTotal = LineItemTotal
        }
        

        //default parameters
        outbound.DiscountType = 'Percent'; //Discount
        
        if (outbound.DiscountPercent === undefined){
            outbound.DiscountPercent = 0;
        }
        
        if (outbound.Discount === undefined){
            outbound.Discount = - (outbound.LineItems[0].LineTotal * (outbound.DiscountPercent / 100));
        }
        outbound.SubTotal = (outbound.LineItems[0].LineTotal) + outbound.Discount; //Subtotal = after discount, before shipping
        if (outbound.Shipping === undefined){
            outbound.Shipping = 0;
        }
        
        outbound.DocumentTotal = (outbound.LineItems[0].LineTotal) + (outbound.Discount) + outbound.Shipping;
        //console.log(outbound.DocumentTotal);
        outbound.DocumentTotalRC = outbound.DocumentTotal;

        
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

        
        
        //Location & Actual Delivery Date - needed for lineItems
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

        outbound.LineItems[0].DeliveryDate = outbound.DeliveryDateActual;
        
        
    
    /*error check for Company & Product
        var str = "";
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
        
        
        
        //*****bundle stringify***************************************************************************
        bundle.request.data = JSON.stringify(outbound);
        return bundle.request;
    },