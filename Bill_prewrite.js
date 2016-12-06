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
            str += "The vendor you entered doesn't exist. Please check 'AccountingSuite' software to find your company entry, or if needed, please use our 'Create_Company Zap' to create a new vendor.";
        } 
        

        //Address default is Primary
        if (outbound.CompanyAddress_Key === undefined && outbound.Company_Key !== undefined) {
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
            var companyAddressRequest =  {
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
            console.log('default address' + outbound.CompanyAddress_Key);
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
        } else {
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
        } 


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
            str += "The product you entered doesn't exist. Please check 'AccountingSuite' software to find your product entry, or if needed, please use our 'Create_Product Zap' to create a new product.";
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
