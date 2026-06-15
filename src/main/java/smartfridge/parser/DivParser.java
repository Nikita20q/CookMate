package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import org.jsoup.nodes.Document;

@Component
public class DivParser implements BaseInstructionParser {
    @Override
    public ArrayNode parsePage(Document document, ObjectMapper mapper) {
        System.out.println("DivParser.parsePage");
        return null;
    }

    @Override
    public int getPriority() {
        return 90;
    }

    @Override
    public String getName() {
        return "DivParser";
    }

    @Override
    public boolean canParse(Document document) {
        Elements divElements = document.select("div.prep_info_text > div.instructions");
        return !divElements.isEmpty();
    }
}