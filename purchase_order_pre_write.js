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
            var defaultAddressRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations?$format=json&$filter=Default eq true",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "GET"
                };
            var defaultAddressResponse = z.request(defaultAddressRequest);
            JSONResponse = JSON.parse(defaultAddressResponse.content);
            //console.log(JSONResponse);
            outbound.Location_Key = JSONResponse.value[0].Ref_Key;
        } else {
            var addressRequest = {
                'url': 'https://apps7.accountingsuite.com/a/' + bundle.auth_fields.tenant_id + 
                    "/odata/standard.odata/Catalog_Locations?$format=json&$filter=Description eq '" + bundle.action_fields.Location_Key + "'",
                'headers': {
                  "Authorization": "Basic " + btoa(bundle.auth_fields.username + ':' + bundle.auth_fields.password)
                }, 
                "method": "POST"
                };
            var addressResponse = z.request(addressRequest);
            JSONResponse = JSON.parse(addressResponse.content);
            console.log('addressResponse: ' + addressResponse.content);
            outbound.Location_Key = JSONResponse.value[0].Ref_Key;
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