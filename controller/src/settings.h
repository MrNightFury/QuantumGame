#pragma once

#include <string.h>
#include <WString.h>
#include <map>

enum class OptionType {
    None,
    String,
    Bool
};

struct Option {
    String strValue = "";
    bool boolValue = false;
    OptionType type = OptionType::None;

    String string() const;
    bool boolean() const;

    Option(String);
    Option(bool);
    Option();
};

class Options {
    public:
        Options();
        bool load();
        bool save();
        void reset();
        Option getOption(const char *name) const;
        void setOption(const char *name, const Option &option);
        Option operator[](const char *name) const;

    private:
        std::map<String, Option> options;
};