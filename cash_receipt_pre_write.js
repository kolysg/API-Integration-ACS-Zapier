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
            var defaultbankResponse = z.request(bankRequest);
            JSONResponse = JSON.parse(defaultbankResponse.content); 
            outbound.BankAccount_Key = JSONResponse.value[0].Ref_Key;
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
            outbound.LineItems[i].Payment = outbound.CashPayment;
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
        
        outbound.CashPayment = bundle.action_fields.CashPayment;
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
        
         //*****bundle stringify****************************
        bundle.request.data = JSON.stringify(outbound);
        console.log(bundle.request.data);
        return bundle.request;
    },
