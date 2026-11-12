package com.obix.netlab;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SignalRadarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
